using System.Globalization;
using CAUSecondHand.Domain.Enums;

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

    // SRS F5.2.2 阶梯式限权：40-59 严重受限（禁止发布），<40 黑名单；故发布门槛为诚信分 ≥60
    public bool IsEligibleToPublish(decimal price) =>
        CreditScore >= 60
        && !IsBanned
        && AuthLevel >= Enums.AuthLevel.L1
        && (AuthLevel >= Enums.AuthLevel.L2 || price < 200);

    // SRS F5.2.2：60-79 受限用户在售商品数量上限为 2，80 分及以上不限量（0 表示不限）
    public int GetActiveItemLimit() => CreditScore >= 80 ? 0 : 2;

    public bool IsEligibleToTransaction() => AuthLevel >= Enums.AuthLevel.L2 && !IsBanned;

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
        // 从学号前 4 位推断入学年份，按本科 4 年学制估算毕业年（供毕业自动降级使用，管理员可后台覆盖）
        if (GraduationYear is null && studentId.Length >= 4
            && int.TryParse(studentId[..4], out var enrollYear)
            && enrollYear is >= 2000 and <= 2100)
        {
            GraduationYear = (enrollYear + 4).ToString(CultureInfo.InvariantCulture);
        }
    }

    // 管理员手动设置/修正毕业年份
    public void SetGraduationYear(string? graduationYear) => GraduationYear = graduationYear;

    public void SetCampusArea(CampusArea area) => CampusArea = area;

    public void SetPassword(string hash) => PasswordHash = hash;

    public bool HasPassword() => PasswordHash != null;

    public void SetSecurityPassword(string hash) => SecurityPasswordHash = hash;

    public bool HasSecurityPassword() => SecurityPasswordHash != null;

    public void Ban() => IsBanned = true;

    public void Unban() => IsBanned = false;

    public void PromoteToAdmin() => RoleType = RoleType.Admin;

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
