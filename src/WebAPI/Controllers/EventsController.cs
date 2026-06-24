using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CAUSecondHand.WebAPI.Controllers;

// 前端行为埋点上报入口（DDD 6.15 t_event_log）：页面点击 / 功能入口点击等。
// 允许游客上报，仅记录聚合所需的最小信息，不写外键，失败不影响主流程。
[ApiController]
[Route("api/v1/events")]
public class EventsController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Track([FromBody] TrackEventDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.EventType))
            return Ok(new { code = 0 });

        var eventType = dto.EventType.Trim();
        if (eventType.Length > 64) eventType = eventType[..64];
        var pageCode = dto.PageCode?.Trim();
        if (pageCode is { Length: > 64 }) pageCode = pageCode[..64];

        db.EventLogs.Add(new EventLog(
            User.GetUserId(), eventType, pageCode, dto.ItemId, dto.RequestId, null));
        await db.SaveChangesAsync();

        return Ok(new { code = 0 });
    }
}

public sealed record TrackEventDTO(
    string EventType,
    string? PageCode,
    Guid? ItemId,
    Guid? RequestId);
