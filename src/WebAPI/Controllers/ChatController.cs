using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using CAUSecondHand.WebAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/chats")]
[Authorize(Policy = "AuthLevelL1")]
public class ChatController(
    AppDbContext db,
    IHubContext<ChatHub> hubContext,
    IAiContentModerator contentModerator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSessions()
    {
        var userId = User.GetUserId();
        var sessions = await db.ChatSessions
            .Where(s => s.UserAId == userId || s.UserBId == userId)
            .OrderByDescending(s => s.LastMessageTime ?? s.CreatedAt)
            .ToListAsync();

        var blockedUserIds = await GetBlockedUserIdsAsync(userId);
        sessions = sessions
            .Where(s => !blockedUserIds.Contains(s.GetOtherPartyId(userId)))
            .ToList();

        var otherUserIds = sessions.Select(s => s.GetOtherPartyId(userId)).ToList();
        var otherUsers = await db.Users
            .Where(u => otherUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var itemIds = sessions.Select(s => s.ItemId).ToList();
        var items = await db.Items
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var result = sessions.Select(s =>
        {
            var other = otherUsers.GetValueOrDefault(s.GetOtherPartyId(userId));
            var item = items.GetValueOrDefault(s.ItemId);
            return new ChatSessionVO
            {
                SessionId = s.Id,
                OtherUserId = s.GetOtherPartyId(userId),
                OtherUserNickname = other?.Nickname ?? "未知用户",
                OtherUserAvatar = other?.AvatarUrl,
                ItemId = s.ItemId,
                ItemTitle = item?.Title,
                ItemPrice = item?.Price ?? 0,
                SellerId = item?.SellerId,
                ItemIsRental = item?.IsRental ?? false,
                ItemRentalRate = item?.RentalRate,
                ItemImage = item?.Images.Count > 0 ? item.Images[0] : null,
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
        if (await IsBlockedBetweenAsync(session.UserAId, session.UserBId))
            return Forbid();

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

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var senderId = User.GetUserId();
        if (senderId == request.ReceiverId)
            return BadRequest(new { code = 4000, message = "不能给自己发送消息" });
        if (await IsBlockedBetweenAsync(senderId, request.ReceiverId))
            return BadRequest(new { code = 4000, message = "对方暂不可联系" });

        // 文本消息内容审核（黄暴/政治/违禁等关键词过滤）
        if (request.MsgType == Domain.Enums.MsgType.Text)
        {
            var banned = await FindBannedAsync(request.Content);
            if (banned is not null)
                return BadRequest(new { code = 4000, message = $"消息包含违规内容「{banned}」，请修改后再发送" });
        }

        // 查找或创建会话
        var session = await db.ChatSessions
            .FirstOrDefaultAsync(s =>
                (s.UserAId == senderId && s.UserBId == request.ReceiverId
                 || s.UserAId == request.ReceiverId && s.UserBId == senderId)
                && s.ItemId == request.ItemId);

        if (session is null)
        {
            session = new ChatSession(request.ItemId, senderId, request.ReceiverId);
            db.ChatSessions.Add(session);
        }

        var message = new Message(session.Id, senderId, request.ReceiverId,
            request.MsgType, request.Content);
        db.Messages.Add(message);

        var preview = request.MsgType == Domain.Enums.MsgType.Image
            ? "[图片]"
            : request.Content.Length > 50 ? request.Content[..50] + "..." : request.Content;
        session.UpdateLastMessage(
            DateTimeOffset.FromUnixTimeMilliseconds(message.Timestamp).UtcDateTime,
            preview);

        await db.SaveChangesAsync();

        // Notify receiver via SignalR (best-effort, non-blocking)
        try
        {
            await hubContext.Clients.Group($"user:{request.ReceiverId}")
                .SendAsync("ReceiveMessage", MessageVO.FromEntity(message));
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "SignalR 推送失败至用户 {ReceiverId}", request.ReceiverId);
        }

        return Ok(new { code = 0, data = MessageVO.FromEntity(message) });
    }

    private async Task<HashSet<Guid>> GetBlockedUserIdsAsync(Guid userId)
    {
        var blocked = await db.BlacklistEntries
            .Where(b => b.UserId == userId)
            .Select(b => b.BlockedId)
            .Concat(db.BlacklistEntries
                .Where(b => b.BlockedId == userId)
                .Select(b => b.UserId))
            .ToListAsync();
        return blocked.ToHashSet();
    }

    private async Task<bool> IsBlockedBetweenAsync(Guid userAId, Guid userBId) =>
        await db.BlacklistEntries.AnyAsync(b =>
            (b.UserId == userAId && b.BlockedId == userBId)
            || (b.UserId == userBId && b.BlockedId == userAId));

    private async Task<string?> FindBannedAsync(string content)
    {
        var local = ContentFilter.FindBanned(content);
        if (local is not null)
            return local;

        return await contentModerator.FindViolationAsync(
            new ContentModerationInput("聊天消息", new[] { content }),
            HttpContext.RequestAborted);
    }
}
