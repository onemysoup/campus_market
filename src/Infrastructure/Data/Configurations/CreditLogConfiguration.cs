using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class CreditLogConfiguration : IEntityTypeConfiguration<CreditLog>
{
    public void Configure(EntityTypeBuilder<CreditLog> builder)
    {
        builder.ToTable("t_credit_log");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.Reason).HasMaxLength(256).IsRequired();
        builder.HasIndex(c => new { c.UserId, c.CreatedAt });
    }
}
