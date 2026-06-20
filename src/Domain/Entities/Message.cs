using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

public sealed class Message
{
    private Message() { }

    public Message(Guid sessionId, Guid senderId, Guid receiverId,
        MsgType msgType, string content)
    {
        Id = Guid.NewGuid();
        SessionId = sessionId;
        SenderId = senderId;
        ReceiverId = receiverId;
        MsgType = msgType;
        Content = content;
        Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        IsRead = false;
    }

    public Guid Id { get; private set; }
    public Guid SessionId { get; private set; }
    public Guid SenderId { get; private set; }
    public Guid ReceiverId { get; private set; }
    public MsgType MsgType { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public long Timestamp { get; private set; }
    public bool IsRead { get; private set; }

    public void MarkAsRead() => IsRead = true;
}
