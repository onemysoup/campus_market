using CAUSecondHand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CAUSecondHand.Infrastructure.Data.Configurations;

public class RequestResponseConfiguration : IEntityTypeConfiguration<RequestResponse>
{
    public void Configure(EntityTypeBuilder<RequestResponse> builder)
    {
        builder.ToTable("t_request_response");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Message).HasMaxLength(256);
        // DDD: uk_response_request_seller_item(request_id, seller_id, item_id) 求购响应不重复
        builder.HasIndex(r => new { r.RequestId, r.SellerId, r.ItemId }).IsUnique();
        builder.HasIndex(r => r.SellerId);
    }
}
