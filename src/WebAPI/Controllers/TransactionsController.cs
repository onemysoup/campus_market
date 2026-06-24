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
            .Include(t => t.Item)
            .ToListAsync();

        var result = transactions
            .Select(t =>
            {
                var pickupCode = t.BuyerId == userId && t.TokenStatus == TokenStatus.Unused
                    ? GetDisplayPickupCode(t)
                    : null;
                return TransactionVO.FromEntity(t, t.Item!.Price, t.Item.Title, pickupCode);
            })
            .ToList();

        return Ok(new { code = 0, data = new { transactions = result, totalCount, page, pageSize } });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        var buyerId = User.GetUserId();
        var securityResult = await ValidateSecurityPasswordAsync(buyerId, request.SecurityPassword);
        if (securityResult is not null)
            return securityResult;

        var buyer = await db.Users.FindAsync(buyerId);
        if (buyer is null || !buyer.IsEligibleToTransaction())
            return BadRequest(new { code = 4000, message = "请完成 L2 认证后再购买商品" });

        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId);
        if (item is null)
            return NotFound(new { code = 4004, message = "商品不存在" });
        if (!item.IsAvailableForBuying())
            return BadRequest(new { code = 4000, message = "商品不可购买" });
        if (item.SellerId == buyerId)
            return BadRequest(new { code = 4000, message = "不能购买自己的商品" });

        var transaction = new Transaction(
            item.Id, buyerId, item.SellerId,
            item.IsRental ? TransactionType.Rental : TransactionType.Sale,
            string.Empty, DateTime.UtcNow.AddDays(1));
        var pickupCode = tokenService.GeneratePickupCode(transaction.Id, buyerId);
        transaction.SetSecureToken(tokenService.HashTransactionToken(transaction.Id, pickupCode));

        if (!string.IsNullOrWhiteSpace(request.AgreedLocation))
            transaction.SetLocation(request.AgreedLocation, request.IsCrossCampus);

        item.TransitionTo(ItemStatus.Reserved);
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = TransactionVO.FromEntity(transaction, item.Price, item.Title, pickupCode) });
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> VerifyPickupCode(Guid id, [FromBody] VerifyTokenRequest request)
    {
        var userId = User.GetUserId();
        var securityResult = await ValidateSecurityPasswordAsync(userId, request.SecurityPassword);
        if (securityResult is not null)
            return securityResult;

        var transaction = await db.Transactions.Include(t => t.Item).FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.SellerId != userId)
            return Forbid();

        var businessResult = transaction.VerifyPickupCode(request.PickupCode, "");
        if (!businessResult.IsSuccess)
            return BadRequest(new { code = 4000, message = businessResult.Error });

        if (!tokenService.VerifyTransactionToken(transaction.Id, request.PickupCode, transaction.SecureToken))
            return BadRequest(new { code = 4000, message = "取货码错误" });

        transaction.ConfirmPickup();
        if (transaction.Item is not null)
            transaction.Item.TransitionTo(ItemStatus.Sold);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "核销成功" });
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelTransaction(Guid id, [FromBody] CancelTransactionRequest request)
    {
        var userId = User.GetUserId();
        var securityResult = await ValidateSecurityPasswordAsync(userId, request.SecurityPassword);
        if (securityResult is not null)
            return securityResult;

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
        var securityResult = await ValidateSecurityPasswordAsync(userId, request.SecurityPassword);
        if (securityResult is not null)
            return securityResult;

        var transaction = await db.Transactions.Include(t => t.Item).FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.SellerId != userId)
            return Forbid();

        var returnCode = tokenService.GenerateReturnCode(id, userId);
        transaction.SetReturnCode(tokenService.HashTransactionToken(id, returnCode));
        var result = transaction.StartRental(request.ExpectedReturnTime);
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "租赁开始" });
    }

    [HttpPost("{id:guid}/rent-return")]
    public async Task<IActionResult> CompleteReturn(Guid id, [FromBody] CompleteReturnRequest? request)
    {
        var userId = User.GetUserId();
        var securityResult = await ValidateSecurityPasswordAsync(userId, request?.SecurityPassword);
        if (securityResult is not null)
            return securityResult;

        var transaction = await db.Transactions.Include(t => t.Item).FirstOrDefaultAsync(t => t.Id == id);
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

    // 交易评价（SRS Could 评价系统）：交易完成后买卖双方可互评一次，1-5 星 + 文字
    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> SubmitReview(Guid id, [FromBody] SubmitReviewDTO dto)
    {
        var userId = User.GetUserId();
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id);
        if (transaction is null)
            return NotFound(new { code = 4004, message = "交易不存在" });
        if (transaction.BuyerId != userId && transaction.SellerId != userId)
            return Forbid();
        if (!transaction.FinishTime.HasValue)
            return BadRequest(new { code = 4000, message = "交易完成后才能评价" });

        // 评价文字内容审核
        var banned = ContentFilter.FindBanned(dto.Comment);
        if (banned is not null)
            return BadRequest(new { code = 4000, message = $"评价包含违规内容「{banned}」，请修改后再提交" });

        var exists = await db.TransactionReviews
            .AnyAsync(r => r.TransactionId == id && r.ReviewerId == userId);
        if (exists)
            return BadRequest(new { code = 4000, message = "你已评价过本次交易" });

        var revieweeId = transaction.BuyerId == userId ? transaction.SellerId : transaction.BuyerId;
        db.TransactionReviews.Add(new TransactionReview(id, userId, revieweeId, dto.Rating, dto.Comment));
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "评价成功" });
    }

    // 查看某用户（作为被评价方）收到的评价与平均分，用于商品详情卖家信誉展示
    [AllowAnonymous]
    [HttpGet("reviews/{userId:guid}")]
    public async Task<IActionResult> GetUserReviews(Guid userId)
    {
        var reviews = await db.TransactionReviews
            .Where(r => r.RevieweeId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new ReviewVO(r.Rating, r.Comment, r.CreatedAt))
            .ToListAsync();

        var average = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.Rating), 1);
        return Ok(new { code = 0, data = new { average, count = reviews.Count, reviews } });
    }

    private string GetDisplayPickupCode(Transaction transaction) =>
        transaction.SecureToken.Length <= 8
            ? transaction.SecureToken
            : tokenService.GeneratePickupCode(transaction.Id, transaction.BuyerId);

    private async Task<IActionResult?> ValidateSecurityPasswordAsync(Guid userId, string? securityPassword)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return Unauthorized(new { code = 4001, message = "未授权访问" });
        if (!user.HasSecurityPassword())
            return BadRequest(new { code = 4000, message = "请先设置安全密码" });
        if (string.IsNullOrWhiteSpace(securityPassword)
            || !PasswordHelper.Verify(securityPassword, user.SecurityPasswordHash!))
            return Unauthorized(new { code = 4001, message = "安全密码错误" });
        return null;
    }
}
