using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace CAUSecondHand.Infrastructure.BackgroundJobs;

// 防鸽子机制（SRS F4.4 防鸽子）：取货码超 24 小时仍未核销，视为交易未达成，
// 自动作废交易并把商品从 Reserved 释放回 Active，避免一货被长期锁死（防一货多鸽）。
[DisallowConcurrentExecution]
public sealed class AntiGhostJob(IServiceScopeFactory scopeFactory) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        var staleTransactions = await db.Transactions
            .Include(t => t.Item)
            .Where(t => t.TokenStatus == TokenStatus.Unused && t.TokenExpiredAt < now)
            .ToListAsync(context.CancellationToken);

        foreach (var transaction in staleTransactions)
        {
            transaction.Cancel("取货码超 24 小时未核销，系统自动释放并重新上架");
            if (transaction.Item is { Status: ItemStatus.Reserved } item)
                item.TransitionTo(ItemStatus.Active);
        }

        await db.SaveChangesAsync(context.CancellationToken);
    }
}
