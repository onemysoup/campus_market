using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

public sealed class StudentVerificationApplication
{
    private StudentVerificationApplication() { }

    public StudentVerificationApplication(Guid userId, string realName, string studentId, string certificateImageUrl)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        RealName = realName;
        StudentId = studentId;
        CertificateImageUrl = certificateImageUrl;
        Status = StudentVerificationStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string RealName { get; private set; } = string.Empty;
    public string StudentId { get; private set; } = string.Empty;
    public string CertificateImageUrl { get; private set; } = string.Empty;
    public StudentVerificationStatus Status { get; private set; }
    public Guid? AdminId { get; private set; }
    public string? AdminNote { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }

    public void Approve(Guid adminId, string? note)
    {
        Status = StudentVerificationStatus.Approved;
        AdminId = adminId;
        AdminNote = note;
        ReviewedAt = DateTime.UtcNow;
    }

    public void Reject(Guid adminId, string? note)
    {
        Status = StudentVerificationStatus.Rejected;
        AdminId = adminId;
        AdminNote = note;
        ReviewedAt = DateTime.UtcNow;
    }
}
