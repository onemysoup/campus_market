using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class ReportLogConfiguration : IEntityTypeConfiguration<ReportLog>
{
    public void Configure(EntityTypeBuilder<ReportLog> builder)
    {
        builder.ToTable("t_report_log");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.EvidenceImages).HasColumnType("json");
        builder.Property(r => r.Description).HasMaxLength(500);
        builder.Property(r => r.AdminNote).HasMaxLength(500);
        builder.Property(r => r.ReasonType).HasConversion<int>();
        builder.Property(r => r.Status).HasConversion<int>();
        builder.HasIndex(r => r.TargetId);
    }
}
