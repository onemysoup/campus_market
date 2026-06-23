using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(
    AppDbContext db,
    IWeChatApiClient weChat,
    IEmailSender emailSender,
    IConfiguration configuration,
    IMemoryCache cache) : ControllerBase
{
    private const string EmailCodePrefix = "email_code:";
    private static readonly TimeSpan CodeExpiry = TimeSpan.FromMinutes(10);

    [HttpPost("wx-login")]
    public async Task<IActionResult> WxLogin([FromBody] WxLoginRequest request)
    {
        var session = await weChat.Code2SessionAsync(request.Code);
        if (session is null)
            return Unauthorized(new { code = 4001, message = "微信登录失败" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.WeChatOpenId == session.OpenId);
        var isNewUser = false;

        if (user is null)
        {
            var defaultNickname = $"用户{Random.Shared.Next(10000, 99999)}";
            user = new User(session.OpenId, defaultNickname);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            isNewUser = true;
        }

        var token = GenerateToken(user);
        return Ok(new
        {
            code = 0,
            data = new LoginResponse(token, user.Id, user.Nickname,
                user.AvatarUrl, user.AuthLevel, user.RoleType.ToString(), isNewUser)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> LoginByPassword([FromBody] LoginByPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.EmailAddress == request.Email);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        if (!user.HasPassword() || !PasswordHelper.Verify(request.Password, user.PasswordHash!))
            return Unauthorized(new { code = 4001, message = "邮箱或密码错误" });

        if (user.IsBanned)
            return Unauthorized(new { code = 4001, message = "账号已被封禁" });

        var token = GenerateToken(user);
        return Ok(new
        {
            code = 0,
            data = new LoginResponse(token, user.Id, user.Nickname,
                user.AvatarUrl, user.AuthLevel, user.RoleType.ToString(), false)
        });
    }

    [HttpPost("send-code")]
    public async Task<IActionResult> SendCode([FromBody] SendCodeRequest request)
    {
        if (!request.Email.EndsWith("@cau.edu.cn", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = 4000, message = "仅支持 CAU 邮箱" });

        var code = Random.Shared.Next(100000, 999999).ToString(CultureInfo.InvariantCulture);
        cache.Set($"{EmailCodePrefix}{request.Email}", code, CodeExpiry);

        await emailSender.SendVerificationCodeAsync(request.Email, code);
        return Ok(new { code = 0, message = "验证码已发送" });
    }

    [Authorize]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var cachedCode = cache.Get<string>($"{EmailCodePrefix}{request.Email}");
        if (cachedCode is null || cachedCode != request.Code)
            return BadRequest(new { code = 4000, message = "验证码错误或已过期" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        user.VerifyEmail(request.Email);
        await db.SaveChangesAsync();

        cache.Remove($"{EmailCodePrefix}{request.Email}");

        var newToken = GenerateToken(user);
        return Ok(new { code = 0, data = new { authLevel = (int)user.AuthLevel, token = newToken } });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        if (!string.IsNullOrEmpty(user.PasswordHash))
            return BadRequest(new { code = 4000, message = "已设置过密码" });

        user.SetPassword(PasswordHelper.Hash(request.Password));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "密码设置成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("set-security-password")]
    public async Task<IActionResult> SetSecurityPassword([FromBody] SetSecurityPasswordRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        if (user.HasSecurityPassword())
            return BadRequest(new { code = 4000, message = "已设置过安全密码" });

        user.SetSecurityPassword(PasswordHelper.Hash(request.Password));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "安全密码设置成功" });
    }


    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("reset-security-password")]
    public async Task<IActionResult> ResetSecurityPassword([FromBody] ResetSecurityPasswordRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        if (string.IsNullOrWhiteSpace(user.EmailAddress))
            return BadRequest(new { code = 4000, message = "请先完成 CAU 邮箱认证" });

        if (!string.Equals(user.EmailAddress, request.Email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = 4000, message = "只能使用当前账号绑定邮箱重置安全密码" });

        var cachedCode = cache.Get<string>($"{EmailCodePrefix}{request.Email}");
        if (cachedCode is null || cachedCode != request.Code)
            return BadRequest(new { code = 4000, message = "验证码错误或已过期" });

        user.SetSecurityPassword(PasswordHelper.Hash(request.NewPassword));
        await db.SaveChangesAsync();

        cache.Remove($"{EmailCodePrefix}{request.Email}");
        return Ok(new { code = 0, message = "安全密码重置成功" });
    }
    [Authorize(Policy = "AuthLevelL1")]
    [HttpGet("student-verification")]
    public async Task<IActionResult> GetStudentVerification()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        var application = await db.StudentVerificationApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (application is null)
            return Ok(new { code = 0, data = new { status = "None", statusCode = -1, authLevel = (int)user.AuthLevel } });

        return Ok(new
        {
            code = 0,
            data = new
            {
                application.Id,
                application.RealName,
                application.StudentId,
                application.CertificateImageUrl,
                status = application.Status.ToString(),
                statusCode = (int)application.Status,
                application.AdminNote,
                application.CreatedAt,
                application.ReviewedAt,
                authLevel = (int)user.AuthLevel,
                token = user.AuthLevel >= AuthLevel.L2 ? GenerateToken(user) : null
            }
        });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("student-verification")]
    public async Task<IActionResult> SubmitStudentVerification([FromBody] SubmitStudentVerificationRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        if (user.AuthLevel >= AuthLevel.L2)
            return BadRequest(new { code = 4000, message = "已完成 L2 高级认证" });

        var hasPending = await db.StudentVerificationApplications
            .AnyAsync(a => a.UserId == userId && a.Status == StudentVerificationStatus.Pending);
        if (hasPending)
            return BadRequest(new { code = 4000, message = "已有待审核的 L2 认证申请" });

        var studentId = request.StudentId.Trim();
        var duplicateApprovedUser = await db.Users
            .AnyAsync(u => u.Id != userId && u.StudentId == studentId && u.AuthLevel >= AuthLevel.L2);
        if (duplicateApprovedUser)
            return BadRequest(new { code = 4000, message = "该学号已完成认证" });

        var duplicatePendingApplication = await db.StudentVerificationApplications
            .AnyAsync(a => a.UserId != userId
                && a.StudentId == studentId
                && a.Status == StudentVerificationStatus.Pending);
        if (duplicatePendingApplication)
            return BadRequest(new { code = 4000, message = "该学号已有待审核申请" });

        var application = new StudentVerificationApplication(
            userId,
            request.RealName.Trim(),
            studentId,
            request.CertificateImageUrl.Trim());

        db.StudentVerificationApplications.Add(application);
        await db.SaveChangesAsync();

        return Ok(new
        {
            code = 0,
            data = new
            {
                application.Id,
                status = application.Status.ToString(),
                statusCode = (int)application.Status,
                application.CreatedAt
            }
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var cachedCode = cache.Get<string>($"{EmailCodePrefix}{request.Email}");
        if (cachedCode is null || cachedCode != request.Code)
            return BadRequest(new { code = 4000, message = "验证码错误或已过期" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.EmailAddress == request.Email);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        user.SetPassword(PasswordHelper.Hash(request.NewPassword));
        await db.SaveChangesAsync();

        cache.Remove($"{EmailCodePrefix}{request.Email}");
        return Ok(new { code = 0, message = "密码重置成功" });
    }

    [Authorize]
    [HttpPut("campus")]
    public async Task<IActionResult> SetCampus([FromBody] SetCampusRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        user.SetCampusArea(request.CampusArea);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "校区设置成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        user.UpdateProfile(request.Nickname, request.AvatarUrl);
        await db.SaveChangesAsync();

        return Ok(new
        {
            code = 0,
            data = new { nickname = user.Nickname, avatarUrl = user.AvatarUrl }
        });
    }

    private string GenerateToken(User user)
    {
        var jwt = configuration.GetSection("Jwt");
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("authLevel", ((int)user.AuthLevel).ToString(CultureInfo.InvariantCulture)),
            new Claim("roleType", user.RoleType.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
