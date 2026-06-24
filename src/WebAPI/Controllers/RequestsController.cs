using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Globalization;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/requests")]
public class RequestsController(
    AppDbContext db,
    IWeChatApiClient weChat,
    IOptions<WeChatOptions> weChatOptions) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] CampusArea? campusArea = null, [FromQuery] CollegeTag? targetCollege = null,
        [FromQuery] ResourceType? resourceType = null)
    {
        var baseQuery = db.Requests
            .Where(r => r.ExpiryDate >= DateOnly.FromDateTime(DateTime.UtcNow));
        if (campusArea.HasValue)
            baseQuery = baseQuery.Where(r => r.CampusArea == campusArea.Value);
        if (targetCollege.HasValue)
            baseQuery = baseQuery.Where(r => r.TargetCollege == targetCollege.Value);
        if (resourceType.HasValue)
            baseQuery = baseQuery.Where(r => r.ResourceType == resourceType.Value);

        var query = baseQuery
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
        var recentTitles = await db.Requests
            .Where(r => r.BuyerId == userId && r.CreatedAt >= DateTime.UtcNow.AddHours(-24))
            .Select(r => r.Title)
            .ToListAsync();
        if (recentTitles.Any(title => CalculateJaccard(title, dto.Title) > 0.8))
            return BadRequest(new { code = 4000, message = "24小时内已发布过相似求购，请勿重复发布" });

        var request = new Request(userId, dto.Title, dto.MaxPrice,
            dto.IsUrgent, dto.ResourceType, dto.CampusArea, dto.TargetCollege);

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

        await NotifyRequestOwnerAsync(request, item);
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

    private static double CalculateJaccard(string left, string right)
    {
        var leftSet = NormalizeForSimilarity(left);
        var rightSet = NormalizeForSimilarity(right);
        if (leftSet.Count == 0 && rightSet.Count == 0)
            return 1;
        var intersection = leftSet.Intersect(rightSet).Count();
        var union = leftSet.Union(rightSet).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }

    private static HashSet<char> NormalizeForSimilarity(string value) =>
        value.Trim()
            .ToLowerInvariant()
            .Where(c => !char.IsWhiteSpace(c) && !char.IsPunctuation(c))
            .ToHashSet();

    private async Task NotifyRequestOwnerAsync(Request request, Item item)
    {
        var templateId = weChatOptions.Value.SubscribeTemplates.RequestResponse;
        if (string.IsNullOrWhiteSpace(templateId))
            return;

        var buyer = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.BuyerId);
        if (buyer is null || string.IsNullOrWhiteSpace(buyer.WeChatOpenId))
            return;

        await weChat.SendSubscribeMessageAsync(new SubscribeMessage(
            buyer.WeChatOpenId,
            templateId,
            $"pages/goods-detail/goods-detail?id={item.Id}",
            new Dictionary<string, string>
            {
                ["thing1"] = request.Title,
                ["thing2"] = item.Title,
                ["amount3"] = $"{item.Price.ToString("0.##", CultureInfo.InvariantCulture)}元",
                ["time4"] = DateTime.UtcNow.AddHours(8).ToString("MM-dd HH:mm", CultureInfo.InvariantCulture)
            }), HttpContext.RequestAborted);
    }
}
