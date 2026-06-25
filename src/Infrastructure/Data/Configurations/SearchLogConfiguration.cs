using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class SearchLogConfiguration : IEntityTypeConfiguration<SearchLog>
{
    public void Configure(EntityTypeBuilder<SearchLog> builder)
    {
        builder.ToTable("t_search_log");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedOnAdd();
        builder.Property(s => s.Keyword).HasMaxLength(64).IsRequired();
        builder.Property(s => s.CampusArea).HasConversion<int>();
        builder.HasIndex(s => new { s.CreatedAt, s.Keyword });
        builder.HasIndex(s => new { s.UserId, s.CreatedAt });
    }
}
