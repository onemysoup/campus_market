using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class EventLogConfiguration : IEntityTypeConfiguration<EventLog>
{
    public void Configure(EntityTypeBuilder<EventLog> builder)
    {
        builder.ToTable("t_event_log");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedOnAdd();
        builder.Property(e => e.EventType).HasMaxLength(64).IsRequired();
        builder.Property(e => e.PageCode).HasMaxLength(64);
        builder.Property(e => e.CampusArea).HasConversion<int>();
        builder.HasIndex(e => new { e.EventType, e.CreatedAt });
        builder.HasIndex(e => new { e.UserId, e.CreatedAt });
        builder.HasIndex(e => e.ItemId);
    }
}
