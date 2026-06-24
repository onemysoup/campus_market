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
            var searchKeywordsJson = "{}";
            var now = DateTime.UtcNow;
            var campusValue = (int)campusArea;

            await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO `t_stats_daily`
    (`StatDate`, `CampusArea`, `TotalPublished`, `TotalTurnover`, `ActiveUsers`, `NewUsers`,
     `CategoryBreakdownJson`, `SearchKeywordsJson`, `CreatedAt`, `UpdatedAt`)
VALUES
    ({statDate}, {campusValue}, {items.Count}, {totalTurnover}, {activeUsers}, {newUserIds.Count},
     CAST({categoryBreakdownJson} AS JSON), CAST({searchKeywordsJson} AS JSON), {now}, {now})
ON DUPLICATE KEY UPDATE
    `TotalPublished` = VALUES(`TotalPublished`),
    `TotalTurnover` = VALUES(`TotalTurnover`),
    `ActiveUsers` = VALUES(`ActiveUsers`),
    `NewUsers` = VALUES(`NewUsers`),
    `CategoryBreakdownJson` = VALUES(`CategoryBreakdownJson`),
    `SearchKeywordsJson` = VALUES(`SearchKeywordsJson`),
    `UpdatedAt` = VALUES(`UpdatedAt`);", context.CancellationToken);
        }
    }
}
