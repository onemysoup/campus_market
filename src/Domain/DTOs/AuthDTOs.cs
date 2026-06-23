using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record WxLoginRequest(string Code);

public sealed record SendCodeRequest(string Email);

public sealed record VerifyEmailRequest(string Email, string Code);

public sealed record LoginByPasswordRequest(string Email, string Password);

public sealed record SetPasswordRequest(string Password);

public sealed record ResetPasswordRequest(string Email, string Code, string NewPassword);

public sealed record UpdateProfileRequest(string? Nickname, string? AvatarUrl);

public sealed record SetCampusRequest(CampusArea CampusArea);

public sealed record LoginResponse(
    string Token,
    Guid UserId,
    string? Nickname,
    string? AvatarUrl,
    AuthLevel AuthLevel,
    string RoleType,
    bool IsNewUser);

public sealed record TestHashRequest(string Password);
