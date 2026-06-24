using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class TransactionReviewConfiguration : IEntityTypeConfiguration<TransactionReview>
{
    public void Configure(EntityTypeBuilder<TransactionReview> builder)
    {
        builder.ToTable("t_transaction_review");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Comment).HasMaxLength(256);
        // 一笔交易里同一评价人只能评一次
        builder.HasIndex(r => new { r.TransactionId, r.ReviewerId }).IsUnique();
        builder.HasIndex(r => r.RevieweeId);
    }
}
