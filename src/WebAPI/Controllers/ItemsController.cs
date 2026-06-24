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
[Route("api/v1/items")]
public class ItemsController(
    AppDbContext db,
    IWeChatApiClient weChat,
    IOptions<WeChatOptions> weChatOptions,
    IAiDescriptionGenerator aiGenerator) : ControllerBase
{
    // AI 辅助生成商品描述（SRS F2.1.7 预留接口）：外部模型可用时调用，否则本地降级生成
    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("ai-describe")]
    public async Task<IActionResult> AiDescribe([FromBody] AiDescribeDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { code = 4000, message = "请先填写商品标题" });

        var description = await aiGenerator.GenerateAsync(
            new AiDescribeInput(dto.Title, dto.Category, dto.ConditionLevel, dto.Keywords),
            HttpContext.RequestAborted);

        return Ok(new { code = 0, data = new { description } });
    }

    [HttpGet]
    public async Task<IActionResult> GetItems([FromQuery] ItemQuery query)
    {
        var viewerId = User.GetUserId();
        var itemsQuery = db.Items
            .Include(i => i.Seller)
            .Where(i => i.Status == ItemStatus.Active && i.ExpiryDate > DateOnly.FromDateTime(DateTime.UtcNow));

        if (viewerId != Guid.Empty)
            itemsQuery = itemsQuery.Where(i => !db.BlacklistEntries
                .Any(b => b.UserId == i.SellerId && b.BlockedId == viewerId));

        if (!string.IsNullOrWhiteSpace(query.Keyword))
            itemsQuery = itemsQuery.Where(i => i.Title.Contains(query.Keyword));
        if (query.Category.HasValue)
            itemsQuery = itemsQuery.Where(i => i.Category == query.Category.Value);
        if (query.ConditionLevel.HasValue)
            itemsQuery = itemsQuery.Where(i => i.ConditionLevel == query.ConditionLevel.Value);
        if (query.CampusArea.HasValue)
            itemsQuery = itemsQuery.Where(i => i.CampusArea == query.CampusArea.Value);
        if (query.TargetCollege.HasValue)
            itemsQuery = itemsQuery.Where(i => i.TargetCollege == query.TargetCollege.Value);
        if (query.MinPrice.HasValue)
            itemsQuery = itemsQuery.Where(i => i.Price >= query.MinPrice.Value);
        if (query.MaxPrice.HasValue)
            itemsQuery = itemsQuery.Where(i => i.Price <= query.MaxPrice.Value);

        var totalCount = await itemsQuery.CountAsync();
        var items = await itemsQuery
            .OrderByDescending(i => i.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(i => ItemCardVO.FromEntity(i))
            .ToListAsync();

        // 搜索埋点（DDD 6.14 t_search_log）：记录关键词与返回结果数，支撑搜索关键词云统计。
        var keyword = query.Keyword?.Trim();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            if (keyword.Length > 64) keyword = keyword[..64];
            db.SearchLogs.Add(new Domain.Entities.SearchLog(
                viewerId, keyword, query.CampusArea, totalCount));
            await db.SaveChangesAsync();
        }

        return Ok(new
        {
            code = 0,
            data = new { items, totalCount, query.Page, query.PageSize }
        });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyItems()
    {
        var userId = User.GetUserId();
        var items = await db.Items
            .Include(i => i.Seller)
            .Where(i => i.SellerId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => ItemCardVO.FromEntity(i))
            .ToListAsync();

        return Ok(new { code = 0, data = items });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpGet("favorites")]
    public async Task<IActionResult> GetFavorites()
    {
        var userId = User.GetUserId();
        var itemIds = await db.Favorites
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.ItemId)
            .ToListAsync();

        var items = await db.Items
            .Include(i => i.Seller)
            .Where(i => itemIds.Contains(i.Id))
            .Select(i => ItemCardVO.FromEntity(i))
            .ToListAsync();

        return Ok(new { code = 0, data = items });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetItem(Guid id)
    {
        var item = await db.Items.Include(i => i.Seller).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });

        var userId = User.GetUserId();
        if (userId != Guid.Empty && await db.BlacklistEntries
                .AnyAsync(b => b.UserId == item.SellerId && b.BlockedId == userId))
            return NotFound(new { code = 4004, message = "商品不存在" });

        item.IncrementViewCount();

        // 行为埋点（DDD 6.15 t_event_log）：商品详情浏览，支撑页面点击量与热度统计。
        db.EventLogs.Add(new Domain.Entities.EventLog(
            userId, "ITEM_DETAIL_VIEW", "goods-detail", id, null, item.CampusArea));

        var isFavorited = userId != Guid.Empty
            && await db.Favorites.AnyAsync(f => f.UserId == userId && f.ItemId == id);
        var canBuy = item.IsAvailableForBuying();

        var seller = SellerBriefVO.FromEntity(item.Seller!);
        var detail = ItemDetailVO.FromEntity(item, seller, isFavorited, canBuy);

        if (userId != Guid.Empty)
        {
            var history = await db.BrowseHistories
                .FirstOrDefaultAsync(h => h.UserId == userId && h.ItemId == id);
            if (history is null)
            {
                db.BrowseHistories.Add(new BrowseHistory(userId, id));
                var count = await db.BrowseHistories.CountAsync(h => h.UserId == userId);
                if (count > 20)
                {
                    var oldest = await db.BrowseHistories
                        .Where(h => h.UserId == userId)
                        .OrderBy(h => h.BrowsedAt)
                        .FirstAsync();
                    db.BrowseHistories.Remove(oldest);
                }
            }
            else
            {
                history.Refresh();
            }
        }

        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = detail });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost]
    public async Task<IActionResult> CreateItem([FromBody] ItemPublishDTO dto)
    {
        var banned = ContentFilter.FindBanned(dto.Title, dto.Description);
        if (banned is not null)
            return BadRequest(new { code = 4000, message = $"内容包含违规词「{banned}」，请修改后重试" });

        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return Unauthorized(new { code = 4001, message = "未授权访问" });
        if (user.IsBanned)
            return BadRequest(new { code = 4000, message = "账号已被封禁，无法发布商品" });
        // SRS F5.2.2：诚信分 40-59 严重受限、<40 黑名单，均禁止发布
        if (user.CreditScore < 60)
            return BadRequest(new { code = 4000, message = "诚信分过低，账号处于受限状态，暂时无法发布商品" });
        if (!user.IsEligibleToPublish(dto.Price))
            return BadRequest(new { code = 4000, message = "L1 用户仅可发布 200 元以下商品，请完成 L2 认证后发布高价商品" });

        // SRS F5.2.2：60-79 分受限用户在售商品数量上限为 2
        var activeLimit = user.GetActiveItemLimit();
        if (activeLimit > 0)
        {
            var activeCount = await db.Items.CountAsync(i => i.SellerId == userId
                && (i.Status == ItemStatus.Active || i.Status == ItemStatus.Reserved));
            if (activeCount >= activeLimit)
                return BadRequest(new { code = 4000, message = $"当前诚信分受限，最多可同时在售 {activeLimit} 件商品" });
        }

        var item = new Item(userId, dto.Title, dto.Description, dto.Price,
            dto.Category, dto.ConditionLevel, dto.Images, dto.CampusArea,
            dto.IsRental, dto.RentalRate, dto.Deposit, dto.TargetCollege,
            dto.SupportCrossCampus);

        item.TransitionTo(ItemStatus.Active);
        db.Items.Add(item);
        await db.SaveChangesAsync();
        await NotifyMatchedRequestsAsync(item);

        return CreatedAtAction(nameof(GetItem), new { id = item.Id },
            new { code = 0, data = ItemCardVO.FromEntity(item) });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> EditItem(Guid id, [FromBody] ItemEditDTO dto)
    {
        var userId = User.GetUserId();
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });
        if (!item.CanBeEditedBy(userId))
            return Forbid();
        var banned = ContentFilter.FindBanned(dto.Title, dto.Description);
        if (banned is not null)
            return BadRequest(new { code = 4000, message = $"内容包含违规词「{banned}」，请修改后重试" });
        var user = await db.Users.FindAsync(userId);
        var targetPrice = dto.Price ?? item.Price;
        if (user is null || !user.IsEligibleToPublish(targetPrice))
            return BadRequest(new { code = 4000, message = "L1 用户仅可发布 200 元以下商品，请完成 L2 认证后发布高价商品" });

        item.Edit(dto.Title, dto.Description, dto.Price,
            dto.Category, dto.ConditionLevel, dto.Images,
            dto.CampusArea, dto.DeliveryPoint,
            dto.IsRental, dto.RentalRate, dto.Deposit,
            dto.TargetCollege, dto.ClearCollege, dto.SupportCrossCampus);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "修改成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ItemStatusChangeDTO dto)
    {
        var userId = User.GetUserId();
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });
        if (!item.CanBeEditedBy(userId))
            return Forbid();

        var result = item.TransitionTo(dto.Status);
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "状态更新成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("{id:guid}/favor")]
    public async Task<IActionResult> AddFavorite(Guid id)
    {
        var userId = User.GetUserId();
        if (await db.Favorites.AnyAsync(f => f.UserId == userId && f.ItemId == id))
            return Ok(new { code = 0, message = "已收藏" });

        var item = await db.Items.FindAsync(id);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });

        db.Favorites.Add(new Favorite(userId, id));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "收藏成功" });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpDelete("{id:guid}/favor")]
    public async Task<IActionResult> RemoveFavorite(Guid id)
    {
        var userId = User.GetUserId();
        var favorite = await db.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.ItemId == id);
        if (favorite is null)
            return NotFound(new { code = 4004, message = "未收藏" });

        db.Favorites.Remove(favorite);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "取消收藏成功" });
    }

    private async Task NotifyMatchedRequestsAsync(Item item)
    {
        var templateId = weChatOptions.Value.SubscribeTemplates.RequestMatch;
        if (string.IsNullOrWhiteSpace(templateId))
            return;

        var resourceType = MapCategoryToResourceType(item.Category);
        var candidates = await db.Requests.AsNoTracking()
            .Where(r => r.BuyerId != item.SellerId
                && r.ExpiryDate >= DateOnly.FromDateTime(DateTime.UtcNow)
                && (r.CampusArea == item.CampusArea
                    || r.CampusArea == CampusArea.Both
                    || item.CampusArea == CampusArea.Both)
                && (!r.MaxPrice.HasValue || item.Price <= r.MaxPrice.Value))
            .Join(db.Users.AsNoTracking(),
                request => request.BuyerId,
                user => user.Id,
                (request, user) => new { Request = request, User = user })
            .ToListAsync();

        var matches = candidates
            .Where(x => x.Request.ResourceType == resourceType
                || CalculateJaccard(x.Request.Title, item.Title) >= 0.25)
            .Where(x => !string.IsNullOrWhiteSpace(x.User.WeChatOpenId))
            .Take(5)
            .ToList();

        foreach (var match in matches)
        {
            await weChat.SendSubscribeMessageAsync(new SubscribeMessage(
                match.User.WeChatOpenId,
                templateId,
                $"pages/goods-detail/goods-detail?id={item.Id}",
                new Dictionary<string, string>
                {
                    ["thing1"] = match.Request.Title,
                    ["thing2"] = item.Title,
                    ["amount3"] = $"{item.Price.ToString("0.##", CultureInfo.InvariantCulture)}元",
                    ["time4"] = DateTime.UtcNow.AddHours(8).ToString("MM-dd HH:mm", CultureInfo.InvariantCulture)
                }), HttpContext.RequestAborted);
        }
    }

    private static ResourceType MapCategoryToResourceType(ItemCategory category) => category switch
    {
        ItemCategory.Textbook => ResourceType.Textbook,
        ItemCategory.Electronics => ResourceType.Electronics,
        ItemCategory.Sports => ResourceType.Sports,
        _ => ResourceType.Daily
    };

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
}
