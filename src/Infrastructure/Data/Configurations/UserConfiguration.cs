using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("t_user");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).ValueGeneratedNever();
        builder.Property(u => u.Nickname).HasMaxLength(50).IsRequired();
        builder.Property(u => u.EmailAddress).HasMaxLength(100);
        builder.Property(u => u.WeChatOpenId).HasMaxLength(100).IsRequired();
        builder.Property(u => u.StudentId).HasMaxLength(32);
        builder.Property(u => u.SecurityPasswordHash).HasMaxLength(255);
        builder.Property(u => u.AvatarUrl).HasMaxLength(500);
        builder.Property(u => u.GraduationYear).HasMaxLength(4);
        builder.Property(u => u.AuthLevel).HasConversion<int>();
        builder.Property(u => u.CampusArea).HasConversion<int>();
        builder.Property(u => u.RoleType).HasConversion<int>();
        builder.Property(u => u.CreditScore).HasDefaultValue(100);
        builder.Property(u => u.IsBanned).HasDefaultValue(false);
        builder.Property(u => u.IsStaff).HasDefaultValue(false);
        builder.HasIndex(u => u.WeChatOpenId).IsUnique();
        builder.HasIndex(u => u.EmailAddress).IsUnique().HasFilter("\"email_address\" IS NOT NULL");
    }
}
