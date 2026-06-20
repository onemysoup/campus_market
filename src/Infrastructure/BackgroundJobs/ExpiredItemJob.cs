using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace CAUSecondHand.Infrastructure.BackgroundJobs;

[DisallowConcurrentExecution]
public sealed class ExpiredItemJob(IServiceScopeFactory scopeFactory) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateOnly.FromDateTime(DateTime.UtcNow);

        var expiredItems = await db.Items
            .Where(i => i.Status == ItemStatus.Active && i.ExpiryDate < now)
            .ToListAsync(context.CancellationToken);

        foreach (var item in expiredItems)
            item.TransitionTo(ItemStatus.Inactive);

        await db.SaveChangesAsync(context.CancellationToken);
    }
}
