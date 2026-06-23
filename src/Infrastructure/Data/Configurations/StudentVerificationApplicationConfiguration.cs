using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public sealed class StudentVerificationApplicationConfiguration : IEntityTypeConfiguration<StudentVerificationApplication>
{
    public void Configure(EntityTypeBuilder<StudentVerificationApplication> builder)
    {
        builder.ToTable("t_student_verification_application");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnType("char(36)");
        builder.Property(a => a.UserId).HasColumnType("char(36)").IsRequired();
        builder.Property(a => a.RealName).HasMaxLength(32).IsRequired();
        builder.Property(a => a.StudentId).HasMaxLength(32).IsRequired();
        builder.Property(a => a.CertificateImageUrl).HasMaxLength(512).IsRequired();
        builder.Property(a => a.Status).IsRequired();
        builder.Property(a => a.AdminNote).HasMaxLength(256);
        builder.Property(a => a.CreatedAt).IsRequired();
        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.Status);
    }
}
