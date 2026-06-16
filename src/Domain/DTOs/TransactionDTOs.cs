using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record CreateTransactionRequest(
    Guid ItemId,
    string? AgreedLocation,
    bool IsCrossCampus = false);

public sealed record VerifyTokenRequest(string PickupCode);

public sealed record CancelTransactionRequest(string? Reason);

public sealed record RentStartRequest(DateTime ExpectedReturnTime);

public sealed record TransactionVO
{
    public required Guid TransactionId { get; init; }
    public required Guid ItemId { get; init; }
    public required Guid BuyerId { get; init; }
    public required Guid SellerId { get; init; }
    public TransactionType TransactionType { get; init; }
    public TokenStatus TokenStatus { get; init; }
    public RentalStatus RentalStatus { get; init; }
    public string? AgreedLocation { get; init; }
    public bool IsCrossCampus { get; init; }
    public DateTime TokenExpiredAt { get; init; }
    public DateTime CreatedAt { get; init; }

    public static TransactionVO FromEntity(Transaction transaction) => new()
    {
        TransactionId = transaction.Id,
        ItemId = transaction.ItemId,
        BuyerId = transaction.BuyerId,
        SellerId = transaction.SellerId,
        TransactionType = transaction.TransactionType,
        TokenStatus = transaction.TokenStatus,
        RentalStatus = transaction.RentalStatus,
        AgreedLocation = transaction.AgreedLocation,
        IsCrossCampus = transaction.IsCrossCampus,
        TokenExpiredAt = transaction.TokenExpiredAt,
        CreatedAt = transaction.CreatedAt
    };
}
