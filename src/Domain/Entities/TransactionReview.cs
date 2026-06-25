namespace CAUSecondHand.Domain.Entities;

// 交易评价（SRS Could：评价系统-文字评分）。交易完成后买卖双方可互评一次，仅文字+星级（不含图片）。
public sealed class TransactionReview
{
    private TransactionReview() { }

    public TransactionReview(Guid transactionId, Guid reviewerId, Guid revieweeId,
        int rating, string? comment)
    {
        Id = Guid.NewGuid();
        TransactionId = transactionId;
        ReviewerId = reviewerId;
        RevieweeId = revieweeId;
        Rating = Math.Clamp(rating, 1, 5);
        Comment = comment;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid TransactionId { get; private set; }
    public Guid ReviewerId { get; private set; }
    public Guid RevieweeId { get; private set; }
    public int Rating { get; private set; }
    public string? Comment { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
