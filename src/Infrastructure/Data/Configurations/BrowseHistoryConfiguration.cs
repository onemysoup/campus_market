using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class BrowseHistoryConfiguration : IEntityTypeConfiguration<BrowseHistory>
{
    public void Configure(EntityTypeBuilder<BrowseHistory> builder)
    {
        builder.ToTable("t_browse_history");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).ValueGeneratedNever();
        builder.HasIndex(b => new { b.UserId, b.ItemId }).IsUnique();
        builder.HasIndex(b => new { b.UserId, b.BrowsedAt });
    }
}
