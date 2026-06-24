using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/users/me")]
[Authorize(Policy = "AuthLevelL1")]
public class ProfileController(AppDbContext db) : ControllerBase
{
    private Guid UserId => User.GetUserId();

    [HttpGet("credit")]
    public async Task<IActionResult> GetCredit()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        return Ok(new { code = 0, data = new { creditScore = user.CreditScore, creditTier = (int)user.GetCreditTier() } });
    }

    [HttpGet("credit/log")]
    public async Task<IActionResult> GetCreditLog([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await db.CreditLogs
            .Where(l => l.UserId == UserId)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => CreditLogVO.FromEntity(l))
            .ToListAsync();

        return Ok(new { code = 0, data = new { logs, page, pageSize } });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var histories = await db.BrowseHistories
            .Where(h => h.UserId == UserId)
            .OrderByDescending(h => h.BrowsedAt)
            .Take(20)
            .ToListAsync();

        var itemIds = histories.Select(h => h.ItemId).ToList();
        var items = await db.Items
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var result = histories.Select(h =>
        {
            var item = items.GetValueOrDefault(h.ItemId);
            return new
            {
                itemId = h.ItemId,
                browsedAt = h.BrowsedAt,
                title = item?.Title,
                price = item?.Price,
                isRental = item?.IsRental ?? false,
                rentalRate = item?.RentalRate,
                image = item is not null && item.Images.Count > 0 ? item.Images[0] : null,
                status = item is not null ? (int)item.Status : (int?)null
            };
        }).ToList();

        return Ok(new { code = 0, data = result });
    }

    [HttpDelete("history")]
    public async Task<IActionResult> ClearHistory()
    {
        var histories = await db.BrowseHistories
            .Where(h => h.UserId == UserId)
            .ToListAsync();

        db.BrowseHistories.RemoveRange(histories);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "浏览记录已清空" });
    }

    [HttpGet("blacklist")]
    public async Task<IActionResult> GetBlacklist()
    {
        var entries = await db.BlacklistEntries
            .Where(b => b.UserId == UserId)
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
    public async Task<IActionResult> AddBlacklist([FromBody] AddBlacklistDTO dto)
    {
        if (UserId == dto.BlockedId)
            return BadRequest(new { code = 4000, message = "不能拉黑自己" });

        if (await db.BlacklistEntries.AnyAsync(b => b.UserId == UserId && b.BlockedId == dto.BlockedId))
            return Ok(new { code = 0, message = "已拉黑" });

        db.BlacklistEntries.Add(new BlacklistEntry(UserId, dto.BlockedId));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "拉黑成功" });
    }

    [HttpDelete("blacklist/{blockedId:guid}")]
    public async Task<IActionResult> RemoveBlacklist(Guid blockedId)
    {
        var entry = await db.BlacklistEntries
            .FirstOrDefaultAsync(b => b.UserId == UserId && b.BlockedId == blockedId);
        if (entry is null)
            return NotFound(new { code = 4004, message = "未拉黑该用户" });

        db.BlacklistEntries.Remove(entry);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "已取消拉黑" });
    }
}
