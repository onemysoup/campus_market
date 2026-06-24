using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<CreditLog> CreditLogs => Set<CreditLog>();
    public DbSet<ReportLog> ReportLogs => Set<ReportLog>();
    public DbSet<BrowseHistory> BrowseHistories => Set<BrowseHistory>();
    public DbSet<BlacklistEntry> BlacklistEntries => Set<BlacklistEntry>();
    public DbSet<Request> Requests => Set<Request>();
    public DbSet<RequestResponse> RequestResponses => Set<RequestResponse>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<StudentVerificationApplication> StudentVerificationApplications => Set<StudentVerificationApplication>();
    public DbSet<SearchLog> SearchLogs => Set<SearchLog>();
    public DbSet<EventLog> EventLogs => Set<EventLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
    }
}
