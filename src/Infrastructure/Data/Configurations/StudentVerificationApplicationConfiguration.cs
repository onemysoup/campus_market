using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class StudentVerificationApplicationConfiguration : IEntityTypeConfiguration<StudentVerificationApplication>
{
    public void Configure(EntityTypeBuilder<StudentVerificationApplication> builder)
    {
        builder.ToTable("t_student_verification_application");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.RealName).HasMaxLength(50).IsRequired();
        builder.Property(a => a.StudentId).HasMaxLength(32).IsRequired();
        builder.Property(a => a.CertificateImageUrl).HasMaxLength(500).IsRequired();
        builder.Property(a => a.AdminNote).HasMaxLength(500);
        builder.Property(a => a.Status).HasConversion<int>();
        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.StudentId);
        builder.HasIndex(a => new { a.Status, a.CreatedAt });
    }
}
