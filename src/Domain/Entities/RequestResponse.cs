namespace CAUSecondHand.Domain.Entities;

/// <summary>
/// 求购响应（"我有它"）：记录求购帖、响应卖家与其提供商品之间的关系。
/// 对应 DDD 6.6 t_request_response。
/// </summary>
public sealed class RequestResponse
{
    private RequestResponse() { }

    public RequestResponse(Guid requestId, Guid sellerId, Guid? itemId, string? message = null)
    {
        Id = Guid.NewGuid();
        RequestId = requestId;
        SellerId = sellerId;
        ItemId = itemId;
        Message = message;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid RequestId { get; private set; }
    public Guid SellerId { get; private set; }
    public Guid? ItemId { get; private set; }
    public string? Message { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
