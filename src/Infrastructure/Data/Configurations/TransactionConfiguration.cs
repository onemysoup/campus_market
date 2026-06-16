using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("t_transaction");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.SecureToken).HasMaxLength(64).IsRequired();
        builder.Property(t => t.RentalReturnCode).HasMaxLength(64);
        builder.Property(t => t.CancelReason).HasMaxLength(255);
        builder.Property(t => t.AgreedLocation).HasMaxLength(256);
        builder.Property(t => t.TransactionType).HasConversion<int>();
        builder.Property(t => t.TokenStatus).HasConversion<int>();
        builder.Property(t => t.RentalStatus).HasConversion<int>();
        builder.HasIndex(t => t.BuyerId);
        builder.HasIndex(t => t.SellerId);
        builder.HasIndex(t => t.ItemId);
    }
}
