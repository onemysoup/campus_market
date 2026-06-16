namespace CAUSecondHand.Domain.Entities;

public sealed class BrowseHistory
{
    private BrowseHistory() { }

    public BrowseHistory(Guid userId, Guid itemId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        ItemId = itemId;
        BrowsedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid ItemId { get; private set; }
    public DateTime BrowsedAt { get; private set; }

    public void Refresh() => BrowsedAt = DateTime.UtcNow;
}
