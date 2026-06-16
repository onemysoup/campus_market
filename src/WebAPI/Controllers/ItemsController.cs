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
[Route("api/v1/items")]
public class ItemsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetItems([FromQuery] ItemQuery query)
    {
        var itemsQuery = db.Items
            .Include(i => i.Seller)
            .Where(i => i.Status == ItemStatus.Active && !i.IsExpired());

        if (!string.IsNullOrWhiteSpace(query.Keyword))
            itemsQuery = itemsQuery.Where(i => i.Title.Contains(query.Keyword));
        if (query.Category.HasValue)
            itemsQuery = itemsQuery.Where(i => i.Category == query.Category.Value);
        if (query.CampusArea.HasValue)
            itemsQuery = itemsQuery.Where(i => i.CampusArea == query.CampusArea.Value);
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

        return Ok(new
        {
            code = 0,
            data = new { items, totalCount, query.Page, query.PageSize }
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetItem(Guid id)
    {
        var item = await db.Items.Include(i => i.Seller).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });

        item.IncrementViewCount();

        var userId = User.GetUserId();
        var isFavorited = userId != Guid.Empty
            && await db.Favorites.AnyAsync(f => f.UserId == userId && f.ItemId == id);
        var canBuy = item.IsAvailableForBuying();

        var seller = SellerBriefVO.FromEntity(item.Seller!);
        var detail = ItemDetailVO.FromEntity(item, seller, isFavorited, canBuy);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = detail });
    }

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost]
    public async Task<IActionResult> CreateItem([FromBody] ItemPublishDTO dto)
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null || !user.IsEligibleToPublish())
            return BadRequest(new { code = 4000, message = "当前认证等级无法发布商品" });

        var item = new Item(userId, dto.Title, dto.Description, dto.Price,
            dto.Category, dto.ConditionLevel, dto.Images, dto.CampusArea);

        item.TransitionTo(ItemStatus.Active);
        db.Items.Add(item);
        await db.SaveChangesAsync();

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

        item.Edit(dto.Title, dto.Description, dto.Price,
            dto.Category, dto.ConditionLevel, dto.Images,
            dto.CampusArea, dto.DeliveryPoint);
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
}
