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
        // 开发环境：使用固定的 OpenId 模拟登录
        var openId = $"dev_openid_{request.Code}";

        var user = await db.Users.FirstOrDefaultAsync(u => u.WeChatOpenId == openId);
        var isNewUser = false;

        if (user is null)
        {
            var defaultNickname = $"用户{Random.Shared.Next(10000, 99999)}";
            user = new User(openId, defaultNickname);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            isNewUser = true;
        }

        var token = GenerateToken(user);
        return Ok(new
        {
            code = 0,
            data = new LoginResponse(token, user.Id, user.Nickname,
                user.AvatarUrl, user.AuthLevel, isNewUser)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> EmailLogin([FromBody] EmailLoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.EmailAddress == request.Email);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        if (string.IsNullOrEmpty(user.SecurityPasswordHash))
            return BadRequest(new { code = 4000, message = "未设置密码，请使用微信登录" });

        if (!PasswordHelper.Verify(request.Password, user.SecurityPasswordHash))
            return BadRequest(new { code = 4000, message = "密码错误" });

        var token = GenerateToken(user);
        return Ok(new
        {
            code = 0,
            data = new LoginResponse(token, user.Id, user.Nickname,
                user.AvatarUrl, user.AuthLevel, false)
        });
    }

    [HttpPost("send-code")]
    public async Task<IActionResult> SendCode([FromBody] SendCodeRequest request)
    {
        if (!request.Email.EndsWith("@cau.edu.cn", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = 4000, message = "仅支持 CAU 邮箱" });

        // 开发环境：固定验证码 123456，跳过邮件发送
        const string code = "123456";
        cache.Set($"{EmailCodePrefix}{request.Email}", code, CodeExpiry);
        Console.WriteLine($"[DEV] 验证码已生成 - 邮箱: {request.Email}, 验证码: {code}");

        return Ok(new { code = 0, message = "验证码已发送" });
    }

    [Authorize(Policy = "AuthLevelL0")]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var cachedCode = cache.Get<string>($"{EmailCodePrefix}{request.Email}");
        if (cachedCode is null || cachedCode != request.Code)
            return BadRequest(new { code = 4000, message = "验证码错误或已过期" });

        // 通过当前登录用户 ID 查找（而非邮箱，因为邮箱还未绑定）
        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { code = 4001, message = "请先登录" });

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户未找到" });

        user.VerifyEmail(request.Email);
        await db.SaveChangesAsync();

        cache.Remove($"{EmailCodePrefix}{request.Email}");

        // 返回新 token（更新 authLevel）
        var token = GenerateToken(user);
        return Ok(new { code = 0, data = new { authLevel = (int)user.AuthLevel, token } });
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

        if (!string.IsNullOrEmpty(user.SecurityPasswordHash))
            return BadRequest(new { code = 4000, message = "已设置过密码" });

        user.SetSecurityPassword(PasswordHelper.Hash(request.Password));
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

        user.SetSecurityPassword(PasswordHelper.Hash(request.NewPassword));
        await db.SaveChangesAsync();

        cache.Remove($"{EmailCodePrefix}{request.Email}");
        return Ok(new { code = 0, message = "密码重置成功" });
    }

    [Authorize(Policy = "AuthLevelL0")]
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

    [Authorize(Policy = "AuthLevelL0")]
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

        return Ok(new { code = 0, data = new { nickname = user.Nickname, avatarUrl = user.AvatarUrl } });
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
