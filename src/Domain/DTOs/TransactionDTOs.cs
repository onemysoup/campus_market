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

public sealed record RentStartRequest(DateTime ExpectedReturnTime, string? PickupCode = null, string? SecurityPassword = null);

public sealed record CompleteReturnRequest(string? ReturnCode = null, string? SecurityPassword = null);

public sealed record TransactionVO
{
    public required Guid TransactionId { get; init; }
    public required Guid ItemId { get; init; }
    public required Guid BuyerId { get; init; }
    public required Guid SellerId { get; init; }
    public string? BuyerNickname { get; init; }
    public string? SellerNickname { get; init; }
    public TransactionType TransactionType { get; init; }
    public TokenStatus TokenStatus { get; init; }
    public RentalStatus RentalStatus { get; init; }
    public string? AgreedLocation { get; init; }
    public bool IsCrossCampus { get; init; }
    public DateTime TokenExpiredAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public decimal Price { get; init; }
    public string? ItemTitle { get; init; }
    public string? FirstImage { get; init; }
    public bool IsRental { get; init; }
    public string? RentalRate { get; init; }
    public decimal? Deposit { get; init; }
    public string? SecureToken { get; init; }
    public string? RentalReturnCode { get; init; }
    public int Status => TokenStatus switch
    {
        TokenStatus.Unused => 0,
        TokenStatus.Verified => 1,
        TokenStatus.Voided => 2,
        _ => 0
    };

    public static TransactionVO FromEntity(Transaction transaction, decimal price = 0,
        string? itemTitle = null, string? secureToken = null, bool isRental = false,
        string? rentalRate = null, decimal? deposit = null, string? firstImage = null,
        string? buyerNickname = null, string? sellerNickname = null, string? rentalReturnCode = null) => new()
        {
            TransactionId = transaction.Id,
            ItemId = transaction.ItemId,
            BuyerId = transaction.BuyerId,
            SellerId = transaction.SellerId,
            BuyerNickname = buyerNickname,
            SellerNickname = sellerNickname,
            TransactionType = transaction.TransactionType,
            TokenStatus = transaction.TokenStatus,
            RentalStatus = transaction.RentalStatus,
            AgreedLocation = transaction.AgreedLocation,
            IsCrossCampus = transaction.IsCrossCampus,
            TokenExpiredAt = transaction.TokenExpiredAt,
            CreatedAt = transaction.CreatedAt,
            Price = price,
            ItemTitle = itemTitle ?? string.Empty,
            FirstImage = firstImage,
            IsRental = isRental || transaction.TransactionType == TransactionType.Rental,
            RentalRate = rentalRate,
            Deposit = deposit,
            SecureToken = secureToken,
            RentalReturnCode = rentalReturnCode
        };
}

/// <summary>提交交易评价（SRS Could 评价系统）。</summary>
public sealed record SubmitReviewDTO(int Rating, string? Comment);

/// <summary>交易评价展示对象。</summary>
public sealed record ReviewVO(int Rating, string? Comment, DateTime CreatedAt);
