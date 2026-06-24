using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.Users.OrderByDescending(u => u.CreatedAt);

        var totalCount = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                userId = u.Id,
                nickname = u.Nickname,
                email = u.EmailAddress,
                authLevel = (int)u.AuthLevel,
                roleType = (int)u.RoleType,
                creditScore = u.CreditScore,
                isBanned = u.IsBanned,
                campusArea = u.CampusArea.HasValue ? (int)u.CampusArea.Value : (int?)null,
                createdAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new { code = 0, data = new { users, totalCount, page, pageSize } });
    }

    [HttpGet("stats/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;

        var data = new
        {
            totalUsers = await db.Users.CountAsync(),
            totalItems = await db.Items.CountAsync(),
            activeItems = await db.Items.CountAsync(i => i.Status == ItemStatus.Active),
            pendingReports = await db.ReportLogs.CountAsync(r => r.Status == ReportStatus.Pending),
            pendingVerifications = await db.StudentVerificationApplications.CountAsync(v => v.Status == StudentVerificationStatus.Pending),
            todayNewUsers = await db.Users.CountAsync(u => u.CreatedAt >= todayStart),
            todayNewItems = await db.Items.CountAsync(i => i.CreatedAt >= todayStart),
            todayTransactions = await db.Transactions.CountAsync(t => t.CreatedAt >= todayStart)
        };

        return Ok(new { code = 0, data });
    }

    [HttpGet("stats/reports")]
    public async Task<IActionResult> GetStatsReport([FromQuery] StatsReportQuery query)
    {
        var report = await BuildStatsReportAsync(query);
        return Ok(new { code = 0, data = report });
    }

    [HttpGet("stats/export")]
    public async Task<IActionResult> ExportStats([FromQuery] StatsReportQuery query)
    {
        var report = await BuildStatsReportAsync(query);
        var csv = BuildStatsCsv(report);
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
        var fileName = $"stats_{report.StartDate:yyyyMMdd}_{report.EndDate:yyyyMMdd}.csv";

        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private async Task<StatsReportResult> BuildStatsReportAsync(StatsReportQuery query)
    {
        var (period, startDate, endDate, start, endExclusive) = ResolveStatsRange(query);
        var campusArea = query.CampusArea;

        var usersQuery = db.Users.AsNoTracking()
            .Where(u => u.CreatedAt >= start && u.CreatedAt < endExclusive);
        if (campusArea.HasValue)
            usersQuery = usersQuery.Where(u => u.CampusArea == campusArea.Value);

        var itemQuery = db.Items.AsNoTracking()
            .Where(i => i.CreatedAt >= start && i.CreatedAt < endExclusive);
        if (campusArea.HasValue)
            itemQuery = itemQuery.Where(i => i.CampusArea == campusArea.Value || i.CampusArea == CampusArea.Both);

        var transactionQuery = db.Transactions.AsNoTracking()
            .Where(t =>
                (t.CreatedAt >= start && t.CreatedAt < endExclusive)
                || (t.FinishTime.HasValue && t.FinishTime.Value >= start && t.FinishTime.Value < endExclusive));
        if (campusArea.HasValue)
            transactionQuery = transactionQuery.Where(t =>
                t.Item!.CampusArea == campusArea.Value || t.Item.CampusArea == CampusArea.Both);

        var users = await usersQuery
            .Select(u => new { u.Id, u.CreatedAt, u.CampusArea, u.AuthLevel })
            .ToListAsync();
        var items = await itemQuery
            .Select(i => new
            {
                i.Id,
                i.Title,
                i.Category,
                i.CampusArea,
                i.TargetCollege,
                i.CreatedAt,
                i.ViewCount,
                i.SellerId,
                i.Status
            })
            .ToListAsync();
        var transactions = await transactionQuery
            .Select(t => new
            {
                t.Id,
                t.ItemId,
                t.BuyerId,
                t.SellerId,
                t.CreatedAt,
                t.FinishTime,
                t.TokenStatus,
                ItemCreatedAt = t.Item!.CreatedAt,
                ItemCategory = t.Item.Category,
                ItemCampusArea = t.Item.CampusArea,
                Price = t.Item.Price
            })
            .ToListAsync();

        var itemIds = items.Select(i => i.Id).ToList();
        var favoriteCounts = itemIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await db.Favorites.AsNoTracking()
                .Where(f => itemIds.Contains(f.ItemId))
                .GroupBy(f => f.ItemId)
                .Select(g => new { ItemId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ItemId, x => x.Count);
        var chatCounts = itemIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await db.ChatSessions.AsNoTracking()
                .Where(s => itemIds.Contains(s.ItemId))
                .GroupBy(s => s.ItemId)
                .Select(g => new { ItemId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ItemId, x => x.Count);

        var completedTransactions = transactions
            .Where(t => t.TokenStatus == TokenStatus.Verified
                && t.FinishTime.HasValue
                && t.FinishTime.Value >= start
                && t.FinishTime.Value < endExclusive)
            .ToList();

        var activeUserIds = users.Select(u => u.Id)
            .Concat(items.Select(i => i.SellerId))
            .Concat(transactions.Select(t => t.BuyerId))
            .Concat(transactions.Select(t => t.SellerId))
            .Distinct()
            .Count();

        var summary = new StatsSummary(
            NewUsers: users.Count,
            NewItems: items.Count,
            CompletedTransactions: completedTransactions.Count,
            TurnoverAmount: completedTransactions.Sum(t => t.Price),
            ActiveUsers: activeUserIds,
            DealRate: items.Count == 0 ? 0 : Math.Round((decimal)completedTransactions.Count / items.Count, 4),
            AverageDealDays: completedTransactions.Count == 0
                ? 0
                : Math.Round(completedTransactions.Average(t =>
                    (t.FinishTime!.Value - t.ItemCreatedAt).TotalDays), 2),
            PendingReports: await db.ReportLogs.CountAsync(r => r.Status == ReportStatus.Pending),
            PendingVerifications: await db.StudentVerificationApplications.CountAsync(v =>
                v.Status == StudentVerificationStatus.Pending)
        );

        var daily = new List<DailyStatsPoint>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dayStart = ToUtcStart(date);
            var dayEnd = ToUtcStart(date.AddDays(1));
            var dayTransactions = transactions
                .Where(t => t.CreatedAt >= dayStart && t.CreatedAt < dayEnd)
                .ToList();
            var dayCompleted = completedTransactions
                .Where(t => t.FinishTime!.Value >= dayStart && t.FinishTime.Value < dayEnd)
                .ToList();
            var dayItems = items.Where(i => i.CreatedAt >= dayStart && i.CreatedAt < dayEnd).ToList();
            var dayUsers = users.Where(u => u.CreatedAt >= dayStart && u.CreatedAt < dayEnd).ToList();

            daily.Add(new DailyStatsPoint(
                Date: date,
                NewUsers: dayUsers.Count,
                NewItems: dayItems.Count,
                CompletedTransactions: dayCompleted.Count,
                TurnoverAmount: dayCompleted.Sum(t => t.Price),
                ActiveUsers: dayUsers.Select(u => u.Id)
                    .Concat(dayItems.Select(i => i.SellerId))
                    .Concat(dayTransactions.Select(t => t.BuyerId))
                    .Concat(dayTransactions.Select(t => t.SellerId))
                    .Distinct()
                    .Count()));
        }

        var campus = new[] { CampusArea.East, CampusArea.West }
            .Select(area =>
            {
                var areaItems = items.Where(i => i.CampusArea == area || i.CampusArea == CampusArea.Both).ToList();
                var areaTransactions = transactions
                    .Where(t => t.ItemCampusArea == area || t.ItemCampusArea == CampusArea.Both)
                    .ToList();
                var areaCompleted = completedTransactions
                    .Where(t => t.ItemCampusArea == area || t.ItemCampusArea == CampusArea.Both)
                    .ToList();
                var areaUsers = users.Where(u => u.CampusArea == area).ToList();

                return new CampusStatsPoint(
                    CampusArea: area,
                    NewUsers: areaUsers.Count,
                    NewItems: areaItems.Count,
                    CompletedTransactions: areaCompleted.Count,
                    ActiveUsers: areaUsers.Select(u => u.Id)
                        .Concat(areaItems.Select(i => i.SellerId))
                        .Concat(areaTransactions.Select(t => t.BuyerId))
                        .Concat(areaTransactions.Select(t => t.SellerId))
                        .Distinct()
                        .Count());
            })
            .ToList();

        var categories = Enum.GetValues<ItemCategory>()
            .Select(category =>
            {
                var categoryItems = items.Where(i => i.Category == category).ToList();
                var categoryCompleted = completedTransactions.Where(t => t.ItemCategory == category).ToList();
                return new CategoryStatsPoint(
                    Category: category,
                    PublishedCount: categoryItems.Count,
                    SoldCount: categoryCompleted.Count,
                    ViewCount: categoryItems.Sum(i => i.ViewCount),
                    FavoriteCount: categoryItems.Sum(i => favoriteCounts.TryGetValue(i.Id, out var count) ? count : 0),
                    ChatCount: categoryItems.Sum(i => chatCounts.TryGetValue(i.Id, out var count) ? count : 0),
                    DealRate: categoryItems.Count == 0
                        ? 0
                        : Math.Round((decimal)categoryCompleted.Count / categoryItems.Count, 4));
            })
            .Where(c => c.PublishedCount > 0 || c.SoldCount > 0 || c.ViewCount > 0)
            .OrderByDescending(c => c.PublishedCount)
            .ThenByDescending(c => c.SoldCount)
            .ToList();

        var topItems = items
            .Select(i =>
            {
                var favorites = favoriteCounts.TryGetValue(i.Id, out var favCount) ? favCount : 0;
                var chats = chatCounts.TryGetValue(i.Id, out var chatCount) ? chatCount : 0;
                return new TopItemStats(
                    ItemId: i.Id,
                    Title: i.Title,
                    Category: i.Category,
                    ViewCount: i.ViewCount,
                    FavoriteCount: favorites,
                    ChatCount: chats,
                    Score: i.ViewCount + favorites * 3 + chats * 2);
            })
            .OrderByDescending(i => i.Score)
            .ThenByDescending(i => i.ViewCount)
            .Take(10)
            .ToList();

        // 学院热度排行（SRS 638）：区间内各学院的发布量与求购量
        var requestColleges = await db.Requests.AsNoTracking()
            .Where(r => r.CreatedAt >= start && r.CreatedAt < endExclusive && r.TargetCollege != null)
            .GroupBy(r => r.TargetCollege!.Value)
            .Select(g => new { College = g.Key, Count = g.Count() })
            .ToListAsync();
        var requestCollegeMap = requestColleges.ToDictionary(x => x.College, x => x.Count);
        var publishCollegeMap = items
            .Where(i => i.TargetCollege != null)
            .GroupBy(i => i.TargetCollege!.Value)
            .ToDictionary(g => g.Key, g => g.Count());
        var colleges = publishCollegeMap.Keys.Union(requestCollegeMap.Keys)
            .Select(college =>
            {
                var published = publishCollegeMap.TryGetValue(college, out var p) ? p : 0;
                var requested = requestCollegeMap.TryGetValue(college, out var r) ? r : 0;
                return new CollegeStatsPoint(college, published, requested, published + requested);
            })
            .OrderByDescending(c => c.TotalCount)
            .ThenByDescending(c => c.PublishedCount)
            .ToList();

        // 搜索关键词云（DDD 6.14 t_search_log）：区间内关键词 TopN，可用于热词云展示
        var searchLogQuery = db.SearchLogs.AsNoTracking()
            .Where(s => s.CreatedAt >= start && s.CreatedAt < endExclusive);
        if (campusArea.HasValue)
            searchLogQuery = searchLogQuery.Where(s => s.CampusArea == campusArea.Value);
        var searchKeywords = (await searchLogQuery
                .GroupBy(s => s.Keyword)
                .Select(g => new { Keyword = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(30)
                .ToListAsync())
            .Select(x => new SearchKeywordStat(x.Keyword, x.Count))
            .ToList();

        // 页面点击量（DDD 6.15 t_event_log）：区间内各页面/功能入口点击分布
        var eventLogQuery = db.EventLogs.AsNoTracking()
            .Where(e => e.CreatedAt >= start && e.CreatedAt < endExclusive);
        if (campusArea.HasValue)
            eventLogQuery = eventLogQuery.Where(e => e.CampusArea == campusArea.Value);
        var pageClicks = (await eventLogQuery
                .GroupBy(e => new { e.PageCode, e.EventType })
                .Select(g => new { g.Key.PageCode, g.Key.EventType, Count = g.Count() })
                .ToListAsync())
            .GroupBy(x => x.PageCode ?? x.EventType)
            .Select(g => new PageClickStat(g.Key, g.Sum(x => x.Count)))
            .OrderByDescending(x => x.Clicks)
            .ToList();

        return new StatsReportResult(
            Period: period,
            StartDate: startDate,
            EndDate: endDate,
            CampusArea: campusArea,
            Summary: summary,
            Daily: daily,
            Campus: campus,
            Categories: categories,
            TopItems: topItems,
            SearchKeywords: searchKeywords,
            PageClicks: pageClicks,
            Colleges: colleges);
    }

    private static (string Period, DateOnly StartDate, DateOnly EndDate, DateTime Start, DateTime EndExclusive)
        ResolveStatsRange(StatsReportQuery query)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var period = string.IsNullOrWhiteSpace(query.Period)
            ? "week"
            : query.Period.Trim().ToLowerInvariant();

        DateOnly startDate;
        DateOnly endDate;

        switch (period)
        {
            case "day":
                startDate = query.StartDate ?? today;
                endDate = startDate;
                break;
            case "month":
                startDate = new DateOnly(today.Year, today.Month, 1);
                endDate = today;
                break;
            case "custom":
                startDate = query.StartDate ?? today.AddDays(-6);
                endDate = query.EndDate ?? today;
                break;
            default:
                period = "week";
                startDate = today.AddDays(-6);
                endDate = today;
                break;
        }

        if (endDate < startDate)
            (startDate, endDate) = (endDate, startDate);

        if (endDate.DayNumber - startDate.DayNumber > 90)
            startDate = endDate.AddDays(-90);

        return (period, startDate, endDate, ToUtcStart(startDate), ToUtcStart(endDate.AddDays(1)));
    }

    private static DateTime ToUtcStart(DateOnly date) =>
        DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

    private static string BuildStatsCsv(StatsReportResult report)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Section,Metric,Value");
        sb.AppendLine(Csv("Summary", "Period", report.Period));
        sb.AppendLine(Csv("Summary", "StartDate", report.StartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)));
        sb.AppendLine(Csv("Summary", "EndDate", report.EndDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)));
        sb.AppendLine(Csv("Summary", "NewUsers", report.Summary.NewUsers));
        sb.AppendLine(Csv("Summary", "NewItems", report.Summary.NewItems));
        sb.AppendLine(Csv("Summary", "CompletedTransactions", report.Summary.CompletedTransactions));
        sb.AppendLine(Csv("Summary", "TurnoverAmount", report.Summary.TurnoverAmount));
        sb.AppendLine(Csv("Summary", "ActiveUsers", report.Summary.ActiveUsers));
        sb.AppendLine(Csv("Summary", "DealRate", report.Summary.DealRate));
        sb.AppendLine();

        sb.AppendLine("Daily,Date,NewUsers,NewItems,CompletedTransactions,TurnoverAmount,ActiveUsers");
        foreach (var item in report.Daily)
            sb.AppendLine(Csv("Daily", item.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                item.NewUsers, item.NewItems, item.CompletedTransactions, item.TurnoverAmount, item.ActiveUsers));

        sb.AppendLine();
        sb.AppendLine("Category,Category,PublishedCount,SoldCount,ViewCount,FavoriteCount,ChatCount,DealRate");
        foreach (var item in report.Categories)
            sb.AppendLine(Csv("Category", (int)item.Category, item.PublishedCount, item.SoldCount,
                item.ViewCount, item.FavoriteCount, item.ChatCount, item.DealRate));

        sb.AppendLine();
        sb.AppendLine("TopItem,ItemId,Title,Category,ViewCount,FavoriteCount,ChatCount,Score");
        foreach (var item in report.TopItems)
            sb.AppendLine(Csv("TopItem", item.ItemId, item.Title, (int)item.Category,
                item.ViewCount, item.FavoriteCount, item.ChatCount, item.Score));

        sb.AppendLine();
        sb.AppendLine("SearchKeyword,Keyword,Count");
        foreach (var item in report.SearchKeywords)
            sb.AppendLine(Csv("SearchKeyword", item.Keyword, item.Count));

        sb.AppendLine();
        sb.AppendLine("PageClick,PageCode,Clicks");
        foreach (var item in report.PageClicks)
            sb.AppendLine(Csv("PageClick", item.PageCode, item.Clicks));

        sb.AppendLine();
        sb.AppendLine("College,College,PublishedCount,RequestCount,TotalCount");
        foreach (var item in report.Colleges)
            sb.AppendLine(Csv("College", (int)item.College, item.PublishedCount, item.RequestCount, item.TotalCount));

        return sb.ToString();
    }

    private static string Csv(params object?[] values) =>
        string.Join(",", values.Select(value =>
        {
            var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
            return text.Contains(',') || text.Contains('"') || text.Contains('\n')
                ? $"\"{text.Replace("\"", "\"\"", StringComparison.Ordinal)}\""
                : text;
        }));

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.ReportLogs
            .Where(r => r.Status == ReportStatus.Pending)
            .OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync();
        var reports = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.ReporterId,
                r.TargetId,
                reason = (int)r.ReasonType,
                r.Description,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { code = 0, data = new { reports, totalCount, page, pageSize } });
    }

    // 不同举报类型对应的诚信分扣减幅度
    private static int CreditPenaltyFor(ReportReason reason) => reason switch
    {
        ReportReason.Fraud => 20,       // 欺诈最严重
        ReportReason.Harassment => 15,  // 骚扰
        ReportReason.Mismatch => 10,    // 货不对板
        ReportReason.Ghost => 10,       // 放鸽子
        ReportReason.Outsider => 5,     // 校外人员
        _ => 5                          // 其他
    };

    [HttpPatch("reports/{id:guid}")]
    public async Task<IActionResult> HandleReport(Guid id, [FromBody] HandleReportDTO dto)
    {
        var adminId = User.GetUserId();
        var report = await db.ReportLogs.FindAsync(id);
        if (report is null)
            return NotFound(new { code = 4004, message = "举报不存在" });
        if (report.Status != ReportStatus.Pending)
            return BadRequest(new { code = 4000, message = "举报已处理，不能重复处理" });

        if (dto.Accept)
        {
            report.Accept(adminId, dto.Note);

            // 采纳举报后联动扣减被举报人诚信分，并写入诚信分流水
            var target = await db.Users.FindAsync(report.TargetId);
            if (target is not null && !target.IsBanned)
            {
                var penalty = CreditPenaltyFor(report.ReasonType);
                var log = target.RecordCreditChange(-penalty, $"举报核实扣分（{report.ReasonType}）", adminId);
                db.CreditLogs.Add(log);

                // 诚信分过低自动封禁
                if (target.CreditScore < 40)
                    target.Ban();
            }
        }
        else
        {
            report.Dismiss(adminId, dto.Note);
        }

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "处理完成" });
    }

    [HttpPatch("users/{id:guid}/ban")]
    public async Task<IActionResult> ToggleBan(Guid id, [FromBody] ToggleBanDTO dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        if (dto.Ban) user.Ban(); else user.Unban();
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = dto.Ban ? "已封禁" : "已解封" });
    }

    [HttpPost("users/{id:guid}/credit")]
    public async Task<IActionResult> AdjustCredit(Guid id, [FromBody] AdjustCreditDTO dto)
    {
        var adminId = User.GetUserId();
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        var log = user.RecordCreditChange(dto.Delta, dto.Reason, adminId);
        db.CreditLogs.Add(log);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = new { user.CreditScore } });
    }

    [HttpGet("verifications")]
    public async Task<IActionResult> GetVerifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? status = null)
    {
        var query = db.StudentVerificationApplications.AsQueryable();

        if (status.HasValue)
            query = query.Where(v => v.Status == (StudentVerificationStatus)status.Value);

        query = query.OrderByDescending(v => v.CreatedAt);

        var totalCount = await query.CountAsync();
        var pagedQuery = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize);

        var verifications = await (
            from v in pagedQuery
            join u in db.Users on v.UserId equals u.Id into users
            from u in users.DefaultIfEmpty()
            select new
            {
                v.Id,
                v.UserId,
                nickname = u.Nickname,
                email = u.EmailAddress,
                v.RealName,
                v.StudentId,
                v.CertificateImageUrl,
                status = (int)v.Status,
                v.AdminNote,
                v.CreatedAt,
                v.ReviewedAt
            })
            .ToListAsync();

        return Ok(new { code = 0, data = new { verifications, totalCount, page, pageSize } });
    }
    [HttpPatch("verifications/{id:guid}")]
    public async Task<IActionResult> HandleVerification(Guid id, [FromBody] HandleVerificationDTO dto)
    {
        var adminId = User.GetUserId();
        var app = await db.StudentVerificationApplications.FirstOrDefaultAsync(v => v.Id == id);
        if (app is null)
            return NotFound(new { code = 4004, message = "申请不存在" });

        var user = await db.Users.FindAsync(app.UserId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        if (dto.Approve)
        {
            app.Approve(adminId);
            user.VerifyStudent(app.StudentId);
        }
        else
        {
            app.Reject(adminId, dto.Reason);
        }

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = dto.Approve ? "认证已通过" : "已驳回" });
    }
}

public sealed record HandleReportDTO(bool Accept, string? Note);

public sealed record ToggleBanDTO(bool Ban);

public sealed record AdjustCreditDTO(int Delta, string Reason);

public sealed record HandleVerificationDTO(bool Approve, string? Reason);

public sealed class StatsReportQuery
{
    public string Period { get; init; } = "week";
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public CampusArea? CampusArea { get; init; }
}

public sealed record StatsReportResult(
    string Period,
    DateOnly StartDate,
    DateOnly EndDate,
    CampusArea? CampusArea,
    StatsSummary Summary,
    IReadOnlyList<DailyStatsPoint> Daily,
    IReadOnlyList<CampusStatsPoint> Campus,
    IReadOnlyList<CategoryStatsPoint> Categories,
    IReadOnlyList<TopItemStats> TopItems,
    IReadOnlyList<SearchKeywordStat> SearchKeywords,
    IReadOnlyList<PageClickStat> PageClicks,
    IReadOnlyList<CollegeStatsPoint> Colleges);

public sealed record SearchKeywordStat(string Keyword, int Count);

public sealed record PageClickStat(string PageCode, int Clicks);

public sealed record CollegeStatsPoint(
    CollegeTag College,
    int PublishedCount,
    int RequestCount,
    int TotalCount);

public sealed record StatsSummary(
    int NewUsers,
    int NewItems,
    int CompletedTransactions,
    decimal TurnoverAmount,
    int ActiveUsers,
    decimal DealRate,
    double AverageDealDays,
    int PendingReports,
    int PendingVerifications);

public sealed record DailyStatsPoint(
    DateOnly Date,
    int NewUsers,
    int NewItems,
    int CompletedTransactions,
    decimal TurnoverAmount,
    int ActiveUsers);

public sealed record CampusStatsPoint(
    CampusArea CampusArea,
    int NewUsers,
    int NewItems,
    int CompletedTransactions,
    int ActiveUsers);

public sealed record CategoryStatsPoint(
    ItemCategory Category,
    int PublishedCount,
    int SoldCount,
    int ViewCount,
    int FavoriteCount,
    int ChatCount,
    decimal DealRate);

public sealed record TopItemStats(
    Guid ItemId,
    string Title,
    ItemCategory Category,
    int ViewCount,
    int FavoriteCount,
    int ChatCount,
    int Score);
