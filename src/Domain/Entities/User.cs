using System.Globalization;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Domain.ValueObjects;

namespace CAUSecondHand.Domain.Entities;

public sealed class User
{
    private User() { }

    public User(string weChatOpenId, string nickname)
    {
        Id = Guid.NewGuid();
        WeChatOpenId = weChatOpenId;
        Nickname = nickname;
        AuthLevel = AuthLevel.L0;
        CreditScore = 100;
        RoleType = RoleType.Student;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Nickname { get; private set; } = string.Empty;
    public string? EmailAddress { get; private set; }
    public string? StudentId { get; private set; }
    public AuthLevel AuthLevel { get; private set; }
    public CampusArea? CampusArea { get; private set; }
    public bool IsStaff { get; private set; }
    public int CreditScore { get; private set; }
    public bool IsBanned { get; private set; }
    // 登录密码哈希（PBKDF2）
    public string? PasswordHash { get; private set; }
    // 6位二级密码哈希（BCrypt），用于确认交易等敏感操作
    public string? SecurityPasswordHash { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string WeChatOpenId { get; private set; } = string.Empty;
    public RoleType RoleType { get; private set; }
    public string? GraduationYear { get; private set; }
    public DateOnly? AuthDate { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsEligibleToPublish() => CreditScore >= 40 && !IsBanned && AuthLevel >= Enums.AuthLevel.L1;

    public bool IsEligibleToTransaction() => AuthLevel >= Enums.AuthLevel.L1 && !IsBanned;

    public CreditTier GetCreditTier() => CreditScore switch
    {
        >= 80 => Enums.CreditTier.Normal,
        >= 60 => Enums.CreditTier.Limited,
        >= 40 => Enums.CreditTier.SeverelyLimited,
        _ => Enums.CreditTier.Blacklisted
    };

    public CreditLog RecordCreditChange(int delta, string reason, Guid? adminId = null)
    {
        CreditScore = Math.Clamp(CreditScore + delta, 0, 100);

        return new CreditLog
        {
            Id = Guid.NewGuid(),
            UserId = Id,
            ChangeAmount = delta,
            Reason = reason,
            ScoreAfter = CreditScore,
            AdminId = adminId,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void VerifyEmail(string email)
    {
        EmailAddress = email;
        AuthLevel = Enums.AuthLevel.L1;
        AuthDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void VerifyStudent(string studentId)
    {
        StudentId = studentId;
        AuthLevel = Enums.AuthLevel.L2;
        AuthDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetCampusArea(CampusArea area) => CampusArea = area;

    public void SetPassword(string hash) => PasswordHash = hash;

    public bool HasPassword() => PasswordHash != null;

    public void SetSecurityPassword(string hash) => SecurityPasswordHash = hash;

    public bool HasSecurityPassword() => SecurityPasswordHash != null;

    public void Ban() => IsBanned = true;

    public void Unban() => IsBanned = false;

    public void UpdateProfile(string? nickname, string? avatarUrl)
    {
        if (nickname != null) Nickname = nickname;
        if (avatarUrl != null) AvatarUrl = avatarUrl;
    }

    public bool IsGraduated(int currentYear) => !IsStaff
        && GraduationYear != null
        && int.Parse(GraduationYear, CultureInfo.InvariantCulture) <= currentYear;

    public void DegradeToL0()
    {
        AuthLevel = Enums.AuthLevel.L0;
        AuthDate = null;
    }
}



