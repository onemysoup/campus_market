using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Quartz;
using System.Globalization;
using System.Text.Json;

namespace CAUSecondHand.Infrastructure.BackgroundJobs;

[DisallowConcurrentExecution]
public sealed class DailyEtlJob(IServiceScopeFactory scopeFactory) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var yesterdayStart = DateTime.UtcNow.Date.AddDays(-1);
        var yesterdayEnd = DateTime.UtcNow.Date;
        var statDate = yesterdayStart.Date;

        foreach (var campusArea in new[] { CampusArea.East, CampusArea.West })
        {
            var newUserIds = await db.Users
                .Where(u => u.CampusArea == campusArea
                    && u.CreatedAt >= yesterdayStart
                    && u.CreatedAt < yesterdayEnd)
                .Select(u => u.Id)
                .ToListAsync(context.CancellationToken);

            var items = await db.Items
                .Where(i => (i.CampusArea == campusArea || i.CampusArea == CampusArea.Both)
                    && i.CreatedAt >= yesterdayStart
                    && i.CreatedAt < yesterdayEnd)
                .Select(i => new { i.Id, i.SellerId, i.Category })
                .ToListAsync(context.CancellationToken);

            var transactions = await db.Transactions
                .Where(t => (t.Item!.CampusArea == campusArea || t.Item.CampusArea == CampusArea.Both)
                    && ((t.CreatedAt >= yesterdayStart && t.CreatedAt < yesterdayEnd)
                        || (t.FinishTime.HasValue
                            && t.FinishTime.Value >= yesterdayStart
                            && t.FinishTime.Value < yesterdayEnd)))
                .Select(t => new
                {
                    t.BuyerId,
                    t.SellerId,
                    t.CreatedAt,
                    t.FinishTime,
                    t.TokenStatus
                })
                .ToListAsync(context.CancellationToken);

            var totalTurnover = transactions.Count(t =>
                t.TokenStatus == TokenStatus.Verified
                && t.FinishTime.HasValue
                && t.FinishTime.Value >= yesterdayStart
                && t.FinishTime.Value < yesterdayEnd);

            var activeUsers = newUserIds
                .Concat(items.Select(i => i.SellerId))
                .Concat(transactions.Select(t => t.BuyerId))
                .Concat(transactions.Select(t => t.SellerId))
                .Distinct()
                .Count();

            var categoryBreakdownJson = JsonSerializer.Serialize(items
                .GroupBy(i => (int)i.Category)
                .ToDictionary(g => g.Key.ToString(CultureInfo.InvariantCulture), g => g.Count()));

            // 搜索关键词 TopN（DDD 6.14 t_search_log → t_stats_daily.search_keywords）
            var searchKeywords = await db.SearchLogs
                .Where(s => s.CampusArea == campusArea
                    && s.CreatedAt >= yesterdayStart && s.CreatedAt < yesterdayEnd)
                .GroupBy(s => s.Keyword)
                .Select(g => new { Keyword = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(30)
                .ToListAsync(context.CancellationToken);
            var searchKeywordsJson = JsonSerializer.Serialize(
                searchKeywords.ToDictionary(x => x.Keyword, x => x.Count));

            // 页面点击分布（DDD 6.15 t_event_log → t_stats_daily.page_clicks）
            var pageClickRows = await db.EventLogs
                .Where(e => e.CampusArea == campusArea
                    && e.CreatedAt >= yesterdayStart && e.CreatedAt < yesterdayEnd)
                .GroupBy(e => new { e.PageCode, e.EventType })
                .Select(g => new { g.Key.PageCode, g.Key.EventType, Count = g.Count() })
                .ToListAsync(context.CancellationToken);
            var pageClicksJson = JsonSerializer.Serialize(pageClickRows
                .GroupBy(x => x.PageCode ?? x.EventType)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Count)));

            var now = DateTime.UtcNow;
            var campusValue = (int)campusArea;

            await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO `t_stats_daily`
    (`StatDate`, `CampusArea`, `TotalPublished`, `TotalTurnover`, `ActiveUsers`, `NewUsers`,
     `CategoryBreakdownJson`, `SearchKeywordsJson`, `PageClicksJson`, `CreatedAt`, `UpdatedAt`)
VALUES
    ({statDate}, {campusValue}, {items.Count}, {totalTurnover}, {activeUsers}, {newUserIds.Count},
     CAST({categoryBreakdownJson} AS JSON), CAST({searchKeywordsJson} AS JSON), CAST({pageClicksJson} AS JSON), {now}, {now})
ON DUPLICATE KEY UPDATE
    `TotalPublished` = VALUES(`TotalPublished`),
    `TotalTurnover` = VALUES(`TotalTurnover`),
    `ActiveUsers` = VALUES(`ActiveUsers`),
    `NewUsers` = VALUES(`NewUsers`),
    `CategoryBreakdownJson` = VALUES(`CategoryBreakdownJson`),
    `SearchKeywordsJson` = VALUES(`SearchKeywordsJson`),
    `PageClicksJson` = VALUES(`PageClicksJson`),
    `UpdatedAt` = VALUES(`UpdatedAt`);", context.CancellationToken);
        }
    }
}
