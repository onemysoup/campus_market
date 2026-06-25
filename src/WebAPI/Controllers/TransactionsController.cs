using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Globalization;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/transactions")]
[Authorize(Policy = "AuthLevelL1")]
public class TransactionsController(
    AppDbContext db,
    TokenService tokenService,
    IWeChatApiClient weChat,
    IOptions<WeChatOptions> weChatOptions,
    IMemoryCache cache) : ControllerBase
{
    private const string PickupAttemptsPrefix = "pickup_attempts:";
    private const string PickupLockPrefix = "pickup_lock:";
    private const int MaxPickupAttempts = 3;
    private static readonly TimeSpan PickupLockDuration = TimeSpan.FromMinutes(10);

    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? role,
        [FromQuery] TokenStatus? status = null,
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

        if (status.HasValue)
            query = query.Where(t => t.TokenStatus == status.Value);

        var totalCount = await query.CountAsync();
        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(t => t.Item)
            .ToListAsync();

        var userIds = transactions
            .SelectMany(t => new[] { t.BuyerId, t.SellerId })
            .Distinct()
            .ToList();
        var users = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var result = transactions
            .Select(t =>
            {
                var pickupCode = t.BuyerId == userId && t.TokenStatus == TokenStatus.Unused
                    ? GetDisplayPickupCode(t)
                    : null;
                var rentalReturnCode = t.SellerId == userId
                    && t.IsRental()
                    && t.RentalStatus == RentalStatus.Renting
                    ? tokenService.GenerateReturnCode(t.Id, t.SellerId)
                    : null;
                users.TryGetValue(t.BuyerId, out var buyer);
                users.TryGetValue(t.SellerId, out var seller);
                return TransactionVO.FromEntity(t, t.Item!.Price, t.Item.Title, pickupCode,
                    t.Item.IsRental, t.Item.RentalRate, t.Item.Deposit,
                    t.Item.Images.Count > 0 ? t.Item.Images[0] : null,
                    buyer?.Nickname, seller?.Nickname, rentalReturnCode);
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

        Transaction? transaction = null;
        var pickupCode = string.Empty;
        var reserved = false;
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var dbTransaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var reservedRows = await db.Items
                .Where(i => i.Id == item.Id
                    && i.Status == ItemStatus.Active
                    && i.ExpiryDate >= today)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(i => i.Status, ItemStatus.Reserved), HttpContext.RequestAborted);
            if (reservedRows != 1)
                return;

            var createdTransaction = new Transaction(
                item.Id, buyerId, item.SellerId,
                item.IsRental ? TransactionType.Rental : TransactionType.Sale,
                string.Empty, DateTime.UtcNow.AddDays(1));
            var createdPickupCode = tokenService.GeneratePickupCode(createdTransaction.Id, buyerId);
            createdTransaction.SetSecureToken(tokenService.HashTransactionToken(createdTransaction.Id, createdPickupCode));

            if (!string.IsNullOrWhiteSpace(request.AgreedLocation))
                createdTransaction.SetLocation(request.AgreedLocation, request.IsCrossCampus);

            db.Transactions.Add(createdTransaction);
            await db.SaveChangesAsync(HttpContext.RequestAborted);
            await dbTransaction.CommitAsync(HttpContext.RequestAborted);

            transaction = createdTransaction;
            pickupCode = createdPickupCode;
            reserved = true;
        });

        if (!reserved || transaction is null)
            return BadRequest(new { code = 4000, message = "商品已被其他用户购买或不可购买" });

        await NotifyPurchaseSuccessAsync(buyer, item);
        var seller = await db.Users.FindAsync(item.SellerId);

        return Ok(new
        {
            code = 0,
            data = TransactionVO.FromEntity(transaction, item.Price, item.Title, pickupCode,
                item.IsRental, item.RentalRate, item.Deposit,
                item.Images.Count > 0 ? item.Images[0] : null,
                buyer.Nickname, seller?.Nickname)
        });
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
        if (transaction.IsRental())
            return BadRequest(new { code = 4000, message = "租赁交易请使用租赁借出流程" });
        if (IsPickupCodeLocked(id, out var remaining))
            return BadRequest(new { code = 4000, message = $"取货码错误次数过多，请 {Math.Ceiling(remaining.TotalMinutes)} 分钟后再试" });

        var pickupCode = request.PickupCode.Trim();
        var businessResult = transaction.VerifyPickupCode(pickupCode, "");
        if (!businessResult.IsSuccess)
            return BadRequest(new { code = 4000, message = businessResult.Error });

        if (!tokenService.VerifyTransactionToken(transaction.Id, pickupCode, transaction.SecureToken))
        {
            RegisterPickupCodeFailure(id);
            return BadRequest(new { code = 4000, message = "取货码错误" });
        }

        transaction.ConfirmPickup();
        if (transaction.Item is not null)
            transaction.Item.TransitionTo(ItemStatus.Sold);
        await db.SaveChangesAsync();
        ClearPickupCodeFailures(id);
        await NotifyTransactionCompletedAsync(transaction);

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
        if (string.IsNullOrWhiteSpace(request.PickupCode))
            return BadRequest(new { code = 4000, message = "请填写买家提供的借出核销码" });
        if (IsPickupCodeLocked(id, out var remaining))
            return BadRequest(new { code = 4000, message = $"借出核销码错误次数过多，请 {Math.Ceiling(remaining.TotalMinutes)} 分钟后再试" });

        var pickupCode = request.PickupCode.Trim();
        var businessResult = transaction.VerifyPickupCode(pickupCode, "");
        if (!businessResult.IsSuccess)
            return BadRequest(new { code = 4000, message = businessResult.Error });
        if (!tokenService.VerifyTransactionToken(transaction.Id, pickupCode, transaction.SecureToken))
        {
            RegisterPickupCodeFailure(id);
            return BadRequest(new { code = 4000, message = "借出核销码错误" });
        }

        var returnCode = tokenService.GenerateReturnCode(id, userId);
        transaction.SetReturnCode(tokenService.HashTransactionToken(id, returnCode));
        var result = transaction.StartRental(request.ExpectedReturnTime);
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });

        await db.SaveChangesAsync();
        ClearPickupCodeFailures(id);
        return Ok(new { code = 0, message = "租赁开始", data = new { returnCode } });
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
        if (transaction.BuyerId != userId)
            return Forbid();
        if (string.IsNullOrWhiteSpace(request?.ReturnCode))
            return BadRequest(new { code = 4000, message = "请填写卖家提供的归还确认码" });
        if (string.IsNullOrWhiteSpace(transaction.RentalReturnCode))
            return BadRequest(new { code = 4000, message = "租赁尚未开始，无法归还" });
        var returnCode = request.ReturnCode.Trim();
        if (!tokenService.VerifyTransactionToken(transaction.Id, returnCode, transaction.RentalReturnCode))
            return BadRequest(new { code = 4000, message = "归还确认码错误" });

        var result = transaction.CompleteReturn();
        if (!result.IsSuccess)
            return BadRequest(new { code = 4000, message = result.Error });
        if (transaction.Item is not null)
            transaction.Item.TransitionTo(ItemStatus.Sold);

        await db.SaveChangesAsync();
        await NotifyTransactionCompletedAsync(transaction);
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
        if (dto.Rating >= 4)
        {
            var reviewee = await db.Users.FindAsync(revieweeId);
            if (reviewee is not null)
            {
                var log = reviewee.RecordCreditChange(2, "交易好评加分");
                db.CreditLogs.Add(log);
            }
        }
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

        // 安全密码是可选的二次确认：不设置、不填写都不阻塞交易。
        if (string.IsNullOrWhiteSpace(securityPassword))
            return null;
        if (!user.HasSecurityPassword())
            return BadRequest(new { code = 4000, message = "尚未设置安全密码，请留空或先设置后再使用" });
        if (!PasswordHelper.Verify(securityPassword, user.SecurityPasswordHash!))
            return BadRequest(new { code = 4000, message = "安全密码错误" });
        return null;
    }

    private bool IsPickupCodeLocked(Guid transactionId, out TimeSpan remaining)
    {
        remaining = TimeSpan.Zero;
        if (!cache.TryGetValue<DateTimeOffset>($"{PickupLockPrefix}{transactionId}", out var lockedUntil))
            return false;

        var now = DateTimeOffset.UtcNow;
        if (lockedUntil <= now)
        {
            ClearPickupCodeFailures(transactionId);
            return false;
        }

        remaining = lockedUntil - now;
        return true;
    }

    private void RegisterPickupCodeFailure(Guid transactionId)
    {
        var attemptsKey = $"{PickupAttemptsPrefix}{transactionId}";
        cache.TryGetValue<int>(attemptsKey, out var attempts);
        attempts += 1;

        if (attempts >= MaxPickupAttempts)
        {
            cache.Set($"{PickupLockPrefix}{transactionId}", DateTimeOffset.UtcNow.Add(PickupLockDuration), PickupLockDuration);
            cache.Remove(attemptsKey);
            return;
        }

        cache.Set(attemptsKey, attempts, PickupLockDuration);
    }

    private void ClearPickupCodeFailures(Guid transactionId)
    {
        cache.Remove($"{PickupAttemptsPrefix}{transactionId}");
        cache.Remove($"{PickupLockPrefix}{transactionId}");
    }

    private async Task NotifyTransactionCompletedAsync(Transaction transaction)
    {
        if (transaction.Item is null)
            return;

        var buyer = await db.Users.FindAsync(transaction.BuyerId);
        if (buyer is null)
            return;

        await NotifyTransactionEventAsync(buyer, transaction.Item, "交易已完成");
    }

    private Task NotifyPurchaseSuccessAsync(User buyer, Item item) =>
        NotifyTransactionEventAsync(buyer, item, "校园二手购买");

    private async Task NotifyTransactionEventAsync(User buyer, Item item, string demand)
    {
        try
        {
            var templateId = weChatOptions.Value.SubscribeTemplates.PurchaseSuccess;
            if (string.IsNullOrWhiteSpace(templateId)
                || string.IsNullOrWhiteSpace(buyer.WeChatOpenId))
                return;

            var price = item.IsRental && item.Deposit.HasValue
                ? item.Deposit.Value
                : item.Price;

            await weChat.SendSubscribeMessageAsync(new SubscribeMessage(
                buyer.WeChatOpenId,
                templateId,
                "pages/my-orders/my-orders",
                new Dictionary<string, string>
                {
                    ["thing6"] = demand,
                    ["thing1"] = item.Title,
                    ["amount10"] = $"{price.ToString("0.##", CultureInfo.InvariantCulture)}元",
                    ["date3"] = DateTime.UtcNow.AddHours(8).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)
                }), HttpContext.RequestAborted);
        }
        catch
        {
            // 订阅消息失败不能回滚已经创建成功的交易。
        }
    }
}
