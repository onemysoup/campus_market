using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/transactions")]
[Authorize(Policy = "AuthLevelL1")]
public class TransactionsController(AppDbContext db, TokenService tokenService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var query = db.Transactions.AsQueryable();

        query = (role?.ToLowerInvariant()) switch
        {
            "buyer" => query.Where(t => t.BuyerId == userId),
            "seller" => query.Where(t => t.SellerId == userId),
            _ => query.Where(t => t.BuyerId == userId || t.SellerId == userId)
        };

        var totalCount = await query.CountAsync();
        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => TransactionVO.FromEntity(t))
            .ToListAsync();

        return Ok(new { code = 0, data = new { transactions, totalCount, page, pageSize } });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        var buyerId = User.GetUserId();
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });
        if (!item.IsAvailableForBuying())
            return BadRequest(new { code = 4000, message = "商品不可购买" });

        var pickupCode = tokenService.GeneratePickupCode(item.Id, buyerId);
        var transaction = new Transaction(
            item.Id, buyerId, item.SellerId,
            item.IsRental ? TransactionType.Rental : TransactionType.Sale,
            pickupCode, DateTime.UtcNow.AddDays(1));

        if (!string.IsNullOrWhiteSpace(request.AgreedLocation))
            transaction.SetLocation(request.AgreedLocation, request.IsCrossCampus);

        item.TransitionTo(ItemStatus.Reserved);
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = TransactionVO.FromEntity(transaction) });
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> VerifyPickupCode(Guid id, [FromBody] VerifyTokenRequest request)
    {
        var userId = User.GetUserId();
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.SellerId != userId)
            return Forbid();

        var businessResult = transaction.VerifyPickupCode(request.PickupCode, "");
        if (!businessResult.IsSuccess)
            return BadRequest(new { code = 4000, message = businessResult.Error });

        if (!TokenService.VerifyToken(request.PickupCode,
                tokenService.GeneratePickupCode(transaction.ItemId, transaction.BuyerId)))
            return BadRequest(new { code = 4000, message = "取货码错误" });

        transaction.ConfirmPickup();
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "核销成功" });
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelTransaction(Guid id, [FromBody] CancelTransactionRequest request)
    {
        var userId = User.GetUserId();
        var transaction = await db.Transactions
            .Include(t => t.Item)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });

        if (!transaction.CanBeCancelledBy(userId))
            return Forbid();

        transaction.Cancel(request.Reason ?? "用户取消");
        transaction.Item?.TransitionTo(ItemStatus.Active);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "交易已取消" });
    }

    [HttpPost("{id:guid}/rent-start")]
    public async Task<IActionResult> StartRental(Guid id, [FromBody] RentStartRequest request)
    {
        var userId = User.GetUserId();
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.SellerId != userId)
            return Forbid();

        var returnCode = tokenService.GenerateReturnCode(id, userId);
        transaction.SetReturnCode(returnCode);
        var result = transaction.StartRental(request.ExpectedReturnTime);
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "租赁开始" });
    }

    [HttpPost("{id:guid}/rent-return")]
    public async Task<IActionResult> CompleteReturn(Guid id)
    {
        var userId = User.GetUserId();
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.SellerId != userId)
            return Forbid();

        var result = transaction.CompleteReturn();
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "归还成功" });
    }
}
