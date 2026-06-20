using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

public sealed class ReportLog
{
    private ReportLog() { }

    public ReportLog(Guid reporterId, Guid targetId, ReportReason reasonType,
        List<string> evidenceImages, string? description)
    {
        Id = Guid.NewGuid();
        ReporterId = reporterId;
        TargetId = targetId;
        ReasonType = reasonType;
        EvidenceImages = evidenceImages;
        Description = description;
        Status = Enums.ReportStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ReporterId { get; private set; }
    public Guid TargetId { get; private set; }
    public Guid? ItemId { get; private set; }
    public ReportReason ReasonType { get; private set; }
    public List<string> EvidenceImages { get; private set; } = [];
    public string? Description { get; private set; }
    public ReportStatus Status { get; private set; }
    public Guid? AdminId { get; private set; }
    public string? AdminNote { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public void Accept(Guid adminId, string? note)
    {
        Status = Enums.ReportStatus.Accepted;
        AdminId = adminId;
        AdminNote = note;
    }

    public void Dismiss(Guid adminId, string? note)
    {
        Status = Enums.ReportStatus.Dismissed;
        AdminId = adminId;
        AdminNote = note;
    }

    public void LinkItem(Guid itemId) => ItemId = itemId;
}
