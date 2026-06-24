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
        else if (user.IsBanned)
        {
            return Unauthorized(new { code = 4001, message = "账号已被封禁" });
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

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "未授权访问" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        return Ok(new
        {
            code = 0,
            data = new
            {
                userId = user.Id,
                nickname = user.Nickname,
                avatarUrl = user.AvatarUrl,
                email = user.EmailAddress,
                authLevel = (int)user.AuthLevel,
                roleType = user.RoleType.ToString(),
                creditScore = user.CreditScore,
                campusArea = user.CampusArea.HasValue ? (int)user.CampusArea.Value : (int?)null
            }
        });
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

        if (!string.Equals(request.Email, (await db.Users.FindAsync(userId))?.EmailAddress, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = 4000, message = "只能使用当前绑定邮箱重置安全密码" });

        var cachedCode = cache.Get<string>($"{EmailCodePrefix}{request.Email}");
        if (cachedCode is null || cachedCode != request.Code)
            return BadRequest(new { code = 4000, message = "验证码错误或已过期" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

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

        var app = await db.StudentVerificationApplications
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (app is null)
            return Ok(new
            {
                code = 0,
                data = new
                {
                    status = "None",
                    statusCode = -1,
                    authLevel = (int)user.AuthLevel
                }
            });

        var token = user.AuthLevel >= AuthLevel.L2 ? GenerateToken(user) : null;

        return Ok(new
        {
            code = 0,
            data = new
            {
                app.Id,
                app.RealName,
                app.StudentId,
                app.CertificateImageUrl,
                status = app.Status.ToString(),
                statusCode = (int)app.Status,
                app.AdminNote,
                app.CreatedAt,
                app.ReviewedAt,
                authLevel = (int)user.AuthLevel,
                token
            }
        });
    }
    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("student-verification")]
    public async Task<IActionResult> SubmitStudentVerification([FromBody] SubmitStudentVerificationRequest request)
    {
        var userId = User.GetUserId();

        // Check if there's already a pending application
        if (await db.StudentVerificationApplications.AnyAsync(a => a.UserId == userId && a.Status == StudentVerificationStatus.Pending))
            return BadRequest(new { code = 4000, message = "已有审核中的申请" });

        var app = new Domain.Entities.StudentVerificationApplication(
            userId, request.RealName, request.StudentId, request.CertificateImageUrl);
        db.StudentVerificationApplications.Add(app);
        await db.SaveChangesAsync();

        return Ok(new
        {
            code = 0,
            message = "申请已提交",
            data = new
            {
                app.Id,
                app.RealName,
                app.StudentId,
                app.CertificateImageUrl,
                status = app.Status.ToString(),
                statusCode = (int)app.Status,
                app.CreatedAt
            }
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
