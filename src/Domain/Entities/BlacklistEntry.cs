namespace CAUSecondHand.Domain.Entities;

public sealed class BlacklistEntry
{
    private BlacklistEntry() { }

    public BlacklistEntry(Guid userId, Guid blockedId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        BlockedId = blockedId;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid BlockedId { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
