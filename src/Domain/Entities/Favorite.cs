namespace CAUSecondHand.Domain.Entities;

public sealed class Favorite
{
    private Favorite() { }

    public Favorite(Guid userId, Guid itemId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        ItemId = itemId;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid ItemId { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
