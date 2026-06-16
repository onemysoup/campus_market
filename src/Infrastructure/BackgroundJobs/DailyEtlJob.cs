using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

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

        var stats = new
        {
            date = DateOnly.FromDateTime(yesterdayStart),
            newUsers = await db.Users.CountAsync(u =>
                u.CreatedAt >= yesterdayStart && u.CreatedAt < yesterdayEnd, context.CancellationToken),
            newItems = await db.Items.CountAsync(i =>
                i.CreatedAt >= yesterdayStart && i.CreatedAt < yesterdayEnd, context.CancellationToken),
            transactions = await db.Transactions.CountAsync(t =>
                t.CreatedAt >= yesterdayStart && t.CreatedAt < yesterdayEnd, context.CancellationToken),
            completedTransactions = await db.Transactions.CountAsync(t =>
                t.FinishTime >= yesterdayStart && t.FinishTime < yesterdayEnd, context.CancellationToken)
        };

        // Log stats — for future implementation with a StatsLog entity
    }
}
