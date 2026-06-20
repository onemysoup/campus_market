namespace CAUSecondHand.Domain.Entities;

public sealed class CreditLog
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public int ChangeAmount { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid? RelatedTransactionId { get; init; }
    public Guid? AdminId { get; init; }
    public int ScoreAfter { get; init; }
    public DateTime CreatedAt { get; init; }

    public bool IsPositive => ChangeAmount > 0;
}
