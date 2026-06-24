using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace CAUSecondHand.Infrastructure.BackgroundJobs;

[DisallowConcurrentExecution]
public sealed class GraduationDegradationJob(IServiceScopeFactory scopeFactory) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var currentYear = DateTime.UtcNow.Year;

        // int.Parse 无法被 EF 翻译为 SQL，先按可翻译条件取候选，再在内存中判断毕业
        var candidates = await db.Users
            .Where(u => !u.IsStaff
                && u.GraduationYear != null
                && u.AuthLevel != Domain.Enums.AuthLevel.L0)
            .ToListAsync(context.CancellationToken);

        var graduatedUsers = candidates.Where(u => u.IsGraduated(currentYear)).ToList();

        foreach (var user in graduatedUsers)
            user.DegradeToL0();

        if (graduatedUsers.Count > 0)
            await db.SaveChangesAsync(context.CancellationToken);
    }
}
