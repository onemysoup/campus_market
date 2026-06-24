using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
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
            .Where(r => r.ExpiryDate >= DateOnly.FromDateTime(DateTime.UtcNow))
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

    // "我有它"：卖家用一件自己在售的商品响应求购帖（DDD 6.6 / SDDD 5.3.1 ResponseService）
    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("{id:guid}/respond")]
    public async Task<IActionResult> Respond(Guid id, [FromBody] RespondRequestDTO dto)
    {
        var userId = User.GetUserId();
        var request = await db.Requests.FirstOrDefaultAsync(r => r.Id == id);
        if (request is null)
            return NotFound(new { code = 4004, message = "求购帖不存在" });
        if (request.IsExpired())
            return BadRequest(new { code = 4000, message = "求购帖已过期" });
        if (request.BuyerId == userId)
            return BadRequest(new { code = 4000, message = "不能响应自己发布的求购" });

        // 校验商品：必须是自己在售（ACTIVE）的商品
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == dto.ItemId);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });
        if (item.SellerId != userId)
            return BadRequest(new { code = 4000, message = "只能用自己发布的商品响应" });
        if (item.Status != ItemStatus.Active)
            return BadRequest(new { code = 4000, message = "该商品当前不在售，无法用于响应" });

        // 幂等去重：同一求购帖 + 同一卖家 + 同一商品只记一次，避免重复刷计数（DDD 求购响应不重复）
        var exists = await db.RequestResponses.AnyAsync(r =>
            r.RequestId == id && r.SellerId == userId && r.ItemId == dto.ItemId);
        if (exists)
            return Ok(new { code = 0, message = "你已用该商品响应过" });

        db.RequestResponses.Add(new RequestResponse(id, userId, dto.ItemId, dto.Message));
        request.IncrementMatchingCount();
        await db.SaveChangesAsync();

        // TODO: 按 SDDD 5.3.1 应在此调用 WxNotifyService 推送买家「有人能提供该商品」通知；
        //       依赖微信订阅消息基建，暂未接入。买家可通过 GET /responses 查看并经商品详情联系卖家。
        return Ok(new { code = 0, message = "响应成功" });
    }

    // 查看某条求购帖收到的响应商品列表（供发布者查看后经商品详情联系卖家）
    [Authorize(Policy = "AuthLevelL1")]
    [HttpGet("{id:guid}/responses")]
    public async Task<IActionResult> GetResponses(Guid id)
    {
        var request = await db.Requests.FirstOrDefaultAsync(r => r.Id == id);
        if (request is null)
            return NotFound(new { code = 4004, message = "求购帖不存在" });

        var items = await db.RequestResponses
            .Where(r => r.RequestId == id && r.ItemId != null)
            .OrderByDescending(r => r.CreatedAt)
            .Join(db.Items.Include(i => i.Seller),
                  resp => resp.ItemId, item => item.Id,
                  (resp, item) => item)
            .Select(item => ItemCardVO.FromEntity(item))
            .ToListAsync();

        return Ok(new { code = 0, data = new { items } });
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
