using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("t_message");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.MsgType).HasConversion<int>();
        builder.Property(m => m.Content).IsRequired();
        builder.HasIndex(m => m.SessionId);
        builder.HasIndex(m => m.SenderId);
        builder.HasIndex(m => m.ReceiverId);
    }
}
