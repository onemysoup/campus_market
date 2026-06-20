using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/users/{userId:guid}")]
[Authorize(Policy = "AuthLevelL0")]
public class ProfileController(AppDbContext db) : ControllerBase
{
    [HttpGet("credit")]
    public async Task<IActionResult> GetCredit(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        return Ok(new { code = 0, data = new { creditScore = user.CreditScore, creditTier = (int)user.GetCreditTier() } });
    }

    [HttpGet("credit/log")]
    public async Task<IActionResult> GetCreditLog(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await db.CreditLogs
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => CreditLogVO.FromEntity(l))
            .ToListAsync();

        return Ok(new { code = 0, data = new { logs, page, pageSize } });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(Guid userId)
    {
        var histories = await db.BrowseHistories
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.BrowsedAt)
            .Take(20)
            .Select(h => new { h.ItemId, h.BrowsedAt })
            .ToListAsync();

        return Ok(new { code = 0, data = histories });
    }

    [HttpDelete("history")]
    public async Task<IActionResult> ClearHistory(Guid userId)
    {
        var histories = await db.BrowseHistories
            .Where(h => h.UserId == userId)
            .ToListAsync();

        db.BrowseHistories.RemoveRange(histories);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "浏览记录已清空" });
    }

    [HttpGet("blacklist")]
    public async Task<IActionResult> GetBlacklist(Guid userId)
    {
        var entries = await db.BlacklistEntries
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var blockedIds = entries.Select(e => e.BlockedId).ToList();
        var blockedUsers = await db.Users
            .Where(u => blockedIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var result = entries.Select(e => new BlacklistVO
        {
            BlockedId = e.BlockedId,
            BlockedNickname = blockedUsers.GetValueOrDefault(e.BlockedId)?.Nickname ?? "未知用户",
            CreatedAt = e.CreatedAt
        }).ToList();

        return Ok(new { code = 0, data = result });
    }

    [HttpPost("blacklist")]
    public async Task<IActionResult> AddBlacklist(Guid userId, [FromBody] AddBlacklistDTO dto)
    {
        if (userId == dto.BlockedId)
            return BadRequest(new { code = 4000, message = "不能拉黑自己" });

        if (await db.BlacklistEntries.AnyAsync(b => b.UserId == userId && b.BlockedId == dto.BlockedId))
            return Ok(new { code = 0, message = "已拉黑" });

        db.BlacklistEntries.Add(new BlacklistEntry(userId, dto.BlockedId));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "拉黑成功" });
    }

    [HttpDelete("blacklist/{blockedId:guid}")]
    public async Task<IActionResult> RemoveBlacklist(Guid userId, Guid blockedId)
    {
        var entry = await db.BlacklistEntries
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedId == blockedId);
        if (entry is null)
            return NotFound(new { code = 4004, message = "未拉黑该用户" });

        db.BlacklistEntries.Remove(entry);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "已取消拉黑" });
    }
}
