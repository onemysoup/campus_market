using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

public sealed class ChatSession
{
    private ChatSession() { }

    public ChatSession(Guid itemId, Guid userAId, Guid userBId)
    {
        Id = Guid.NewGuid();
        ItemId = itemId;
        UserAId = userAId;
        UserBId = userBId;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ItemId { get; private set; }
    public Guid UserAId { get; private set; }
    public Guid UserBId { get; private set; }
    public DateTime? LastMessageTime { get; private set; }
    public string? LastMessagePreview { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool Involves(Guid userId) => userId == UserAId || userId == UserBId;

    public Guid GetOtherPartyId(Guid myId) => myId == UserAId ? UserBId : UserAId;

    public void UpdateLastMessage(DateTime time, string preview)
    {
        LastMessageTime = time;
        LastMessagePreview = preview;
    }
}
