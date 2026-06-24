using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    public async Task<IActionResult> GetReportStats()
    {
        var stats = await db.ReportLogs
            .GroupBy(r => r.ReasonType)
            .Select(g => new { reason = (int)g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new { code = 0, data = stats });
    }

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
