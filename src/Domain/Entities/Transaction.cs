using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Domain.ValueObjects;

namespace CAUSecondHand.Domain.Entities;

public sealed class Transaction
{
    private Transaction() { }

    public Transaction(Guid itemId, Guid buyerId, Guid sellerId,
        TransactionType type, string secureToken, DateTime tokenExpiredAt)
    {
        Id = Guid.NewGuid();
        ItemId = itemId;
        BuyerId = buyerId;
        SellerId = sellerId;
        TransactionType = type;
        SecureToken = secureToken;
        TokenExpiredAt = tokenExpiredAt;
        TokenStatus = TokenStatus.Unused;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ItemId { get; private set; }
    public Item? Item { get; private set; }
    public Guid BuyerId { get; private set; }
    public Guid SellerId { get; private set; }
    public TransactionType TransactionType { get; private set; }
    public string SecureToken { get; private set; } = string.Empty;
    public string? RentalReturnCode { get; private set; }
    public TokenStatus TokenStatus { get; private set; }
    public RentalStatus RentalStatus { get; private set; } = RentalStatus.NotApplicable;
    public DateTime? ExpectedReturnTime { get; private set; }
    public string? AgreedLocation { get; private set; }
    public bool IsCrossCampus { get; private set; }
    public DateTime TokenExpiredAt { get; private set; }
    public DateTime? FinishTime { get; private set; }
    public string? CancelReason { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsTokenExpired() => DateTime.UtcNow > TokenExpiredAt;

    public bool IsRental() => TransactionType == Enums.TransactionType.Rental;

    public bool IsOverdue() => IsRental()
        && RentalStatus == Enums.RentalStatus.Renting
        && ExpectedReturnTime.HasValue
        && DateTime.UtcNow > ExpectedReturnTime.Value;

    public bool CanBeCancelledBy(Guid userId) =>
        TokenStatus == TokenStatus.Unused
        && (userId == BuyerId || userId == SellerId);

    public Result VerifyPickupCode(string inputCode, string hmacKey)
    {
        if (TokenStatus != TokenStatus.Unused)
            return Result.Failure("取货码状态异常");

        if (IsTokenExpired())
            return Result.Failure("取货码已过期");

        // HMAC verification happens in Infrastructure layer
        // This entity method validates business rules only
        return Result.Success();
    }

    public Result ConfirmPickup()
    {
        if (TokenStatus != TokenStatus.Unused)
            return Result.Failure("取货码状态异常");

        TokenStatus = TokenStatus.Verified;
        FinishTime = DateTime.UtcNow;
        return Result.Success();
    }

    public Result Cancel(string reason)
    {
        if (TokenStatus == TokenStatus.Verified)
            return Result.Failure("取货码已核销，无法取消");

        TokenStatus = TokenStatus.Voided;
        CancelReason = reason;
        return Result.Success();
    }

    public void SetSecureToken(string tokenHash) => SecureToken = tokenHash;

    public Result StartRental(DateTime expectedReturnTime)
    {
        if (!IsRental())
            return Result.Failure("非租赁交易");
        if (RentalStatus == Enums.RentalStatus.Renting)
            return Result.Failure("租赁已开始");
        if (RentalStatus == Enums.RentalStatus.Returned)
            return Result.Failure("租赁已归还");
        if (TokenStatus != TokenStatus.Unused)
            return Result.Failure("取货码状态异常");

        RentalStatus = Enums.RentalStatus.Renting;
        ExpectedReturnTime = expectedReturnTime;
        return Result.Success();
    }

    public void SetReturnCode(string returnCodeHash) => RentalReturnCode = returnCodeHash;

    public Result CompleteReturn()
    {
        if (!IsRental())
            return Result.Failure("非租赁交易");
        if (RentalStatus != Enums.RentalStatus.Renting)
            return Result.Failure("租赁尚未开始或已完成");

        RentalStatus = Enums.RentalStatus.Returned;
        TokenStatus = TokenStatus.Verified;
        FinishTime = DateTime.UtcNow;
        return Result.Success();
    }

    public void MarkOverdue() => RentalStatus = Enums.RentalStatus.Overdue;

    public void SetLocation(string location, bool isCrossCampus)
    {
        AgreedLocation = location;
        IsCrossCampus = isCrossCampus;
    }
}
