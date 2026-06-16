using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/requests")]
public class RequestsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.Requests
            .Where(r => !r.IsExpired())
            .OrderByDescending(r => r.IsUrgent)
            .ThenByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => RequestVO.FromEntity(r))
            .ToListAsync();

        return Ok(new { code = 0, data = new { items, totalCount, page, pageSize } });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateRequestDTO dto)
    {
        var userId = User.GetUserId();
        var request = new Request(userId, dto.Title, dto.MaxPrice,
            dto.IsUrgent, dto.ResourceType, dto.CampusArea);

        db.Requests.Add(request);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = RequestVO.FromEntity(request) });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("{id:guid}/respond")]
    public async Task<IActionResult> Respond(Guid id)
    {
        var request = await db.Requests.FirstOrDefaultAsync(r => r.Id == id);
        if (request is null)
            return NotFound(new { code = 4004, message = "求购帖不存在" });
        if (request.IsExpired())
            return BadRequest(new { code = 4000, message = "求购帖已过期" });

        request.IncrementMatchingCount();
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "响应成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("{id:guid}/renew")]
    public async Task<IActionResult> Renew(Guid id)
    {
        var userId = User.GetUserId();
        var request = await db.Requests.FirstOrDefaultAsync(r => r.Id == id);
        if (request is null)
            return NotFound(new { code = 4004, message = "求购帖不存在" });
        if (request.BuyerId != userId)
            return Forbid();

        var result = request.Renew();
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "续期成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> CloseRequest(Guid id)
    {
        var userId = User.GetUserId();
        var request = await db.Requests.FirstOrDefaultAsync(r => r.Id == id);
        if (request is null)
            return NotFound(new { code = 4004, message = "求购帖不存在" });
        if (request.BuyerId != userId)
            return Forbid();

        db.Requests.Remove(request);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "求购帖已关闭" });
    }
}
