using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record ReportUserDTO(
    Guid TargetId,
    ReportReason ReasonType,
    List<string>? EvidenceImages,
    string? Description);

public sealed record CreditLogVO
{
    public required int ChangeAmount { get; init; }
    public required string Reason { get; init; }
    public int ScoreAfter { get; init; }
    public DateTime CreatedAt { get; init; }

    public static CreditLogVO FromEntity(CreditLog log) => new()
    {
        ChangeAmount = log.ChangeAmount,
        Reason = log.Reason,
        ScoreAfter = log.ScoreAfter,
        CreatedAt = log.CreatedAt
    };
}

public sealed record AddBlacklistDTO(Guid BlockedId);

public sealed record BlacklistVO
{
    public required Guid BlockedId { get; init; }
    public required string BlockedNickname { get; init; }
    public DateTime CreatedAt { get; init; }
}
