using System.Globalization;
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

        var graduatedUsers = await db.Users
            .Where(u => !u.IsStaff && u.GraduationYear != null
                && int.Parse(u.GraduationYear, CultureInfo.InvariantCulture) <= currentYear
                && u.AuthLevel != Domain.Enums.AuthLevel.L0)
            .ToListAsync(context.CancellationToken);

        foreach (var user in graduatedUsers)
            user.DegradeToL0();

        await db.SaveChangesAsync(context.CancellationToken);
    }
}
