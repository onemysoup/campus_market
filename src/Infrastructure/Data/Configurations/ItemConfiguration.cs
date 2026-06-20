using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("t_item");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.Title).HasMaxLength(100).IsRequired();
        builder.Property(i => i.Description).HasMaxLength(2000).IsRequired();
        builder.Property(i => i.Price).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(i => i.RentalRate).HasMaxLength(64);
        builder.Property(i => i.Deposit).HasColumnType("decimal(10,2)");
        builder.Property(i => i.DeliveryPoint).HasMaxLength(128);
        builder.Property(i => i.Status).HasConversion<int>().HasDefaultValue(Domain.Enums.ItemStatus.Draft);
        builder.Property(i => i.Category).HasConversion<int>();
        builder.Property(i => i.ConditionLevel).HasConversion<int>();
        builder.Property(i => i.CampusArea).HasConversion<int>();
        builder.Property(i => i.Images).HasColumnType("json");
        builder.Property(i => i.ViewCount).HasDefaultValue(0);
        builder.Property(i => i.IsNegotiable).HasDefaultValue(true);
        builder.HasOne(i => i.Seller).WithMany().HasForeignKey(i => i.SellerId);
        builder.HasIndex(i => i.SellerId);
        builder.HasIndex(i => new { i.Status, i.CampusArea, i.CreatedAt });
    }
}
