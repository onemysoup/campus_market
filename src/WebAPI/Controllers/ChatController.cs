using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/chats")]
[Authorize(Policy = "AuthLevelL1")]
public class ChatController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSessions()
    {
        var userId = User.GetUserId();
        var sessions = await db.ChatSessions
            .Where(s => s.UserAId == userId || s.UserBId == userId)
            .OrderByDescending(s => s.LastMessageTime ?? s.CreatedAt)
            .ToListAsync();

        var otherUserIds = sessions.Select(s => s.GetOtherPartyId(userId)).ToList();
        var otherUsers = await db.Users
            .Where(u => otherUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var result = sessions.Select(s =>
        {
            var other = otherUsers.GetValueOrDefault(s.GetOtherPartyId(userId));
            return new ChatSessionVO
            {
                SessionId = s.Id,
                OtherUserId = s.GetOtherPartyId(userId),
                OtherUserNickname = other?.Nickname ?? "未知用户",
                OtherUserAvatar = other?.AvatarUrl,
                ItemId = s.ItemId,
                LastMessagePreview = s.LastMessagePreview,
                LastMessageTime = s.LastMessageTime,
                CreatedAt = s.CreatedAt
            };
        }).ToList();

        return Ok(new { code = 0, data = result });
    }

    [HttpGet("{sessionId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid sessionId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = User.GetUserId();
        var session = await db.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null || !session.Involves(userId))
            return NotFound(new { code = 4004, message = "会话不存在" });

        var messages = await db.Messages
            .Where(m => m.SessionId == sessionId)
            .OrderByDescending(m => m.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(m => m.Timestamp)
            .Select(m => MessageVO.FromEntity(m))
            .ToListAsync();

        return Ok(new { code = 0, data = new { messages, page, pageSize } });
    }
}
