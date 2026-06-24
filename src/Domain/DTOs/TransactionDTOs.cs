using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record CreateTransactionRequest(
    Guid ItemId,
    string? AgreedLocation,
    bool IsCrossCampus = false,
    string? SecurityPassword = null);

public sealed record VerifyTokenRequest(string PickupCode, string? SecurityPassword = null);

public sealed record CancelTransactionRequest(string? Reason, string? SecurityPassword = null);

public sealed record RentStartRequest(DateTime ExpectedReturnTime, string? SecurityPassword = null);

public sealed record CompleteReturnRequest(string? SecurityPassword = null);

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
    public decimal Price { get; init; }
    public string? ItemTitle { get; init; }
    public string? SecureToken { get; init; }
    public int Status => TokenStatus switch
    {
        TokenStatus.Unused => 0,
        TokenStatus.Verified => 1,
        TokenStatus.Voided => 2,
        _ => 0
    };

    public static TransactionVO FromEntity(Transaction transaction, decimal price = 0, string? itemTitle = null, string? secureToken = null) => new()
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
        CreatedAt = transaction.CreatedAt,
        Price = price,
        ItemTitle = itemTitle ?? string.Empty,
        SecureToken = secureToken
    };
}

/// <summary>提交交易评价（SRS Could 评价系统）。</summary>
public sealed record SubmitReviewDTO(int Rating, string? Comment);

/// <summary>交易评价展示对象。</summary>
public sealed record ReviewVO(int Rating, string? Comment, DateTime CreatedAt);
