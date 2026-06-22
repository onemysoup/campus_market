using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record ChatSessionVO
{
    public required Guid SessionId { get; init; }
    public required Guid OtherUserId { get; init; }
    public required string OtherUserNickname { get; init; }
    public string? OtherUserAvatar { get; init; }
    public Guid ItemId { get; init; }
    public string? LastMessagePreview { get; init; }
    public DateTime? LastMessageTime { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record MessageVO
{
    public required Guid MessageId { get; init; }
    public required Guid SessionId { get; init; }
    public required Guid SenderId { get; init; }
    public required Guid ReceiverId { get; init; }
    public MsgType MsgType { get; init; }
    public required string Content { get; init; }
    public long Timestamp { get; init; }
    public bool IsRead { get; init; }

    public static MessageVO FromEntity(Message msg) => new()
    {
        MessageId = msg.Id,
        SessionId = msg.SessionId,
        SenderId = msg.SenderId,
        ReceiverId = msg.ReceiverId,
        MsgType = msg.MsgType,
        Content = msg.Content,
        Timestamp = msg.Timestamp,
        IsRead = msg.IsRead
    };
}

public sealed record SendMessageRequest(
    Guid ReceiverId,
    Guid ItemId,
    string Content,
    MsgType MsgType = MsgType.Text);
