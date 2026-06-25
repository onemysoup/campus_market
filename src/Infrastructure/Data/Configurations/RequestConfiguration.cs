using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class RequestConfiguration : IEntityTypeConfiguration<Request>
{
    public void Configure(EntityTypeBuilder<Request> builder)
    {
        builder.ToTable("t_request");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Title).HasMaxLength(50).IsRequired();
        builder.Property(r => r.ResourceType).HasConversion<int>();
        builder.Property(r => r.CampusArea).HasConversion<int>();
        builder.Property(r => r.TargetCollege).HasConversion<int>();
        builder.Property(r => r.MaxPrice).HasColumnType("decimal(10,2)");
        builder.HasIndex(r => r.BuyerId);
    }
}
