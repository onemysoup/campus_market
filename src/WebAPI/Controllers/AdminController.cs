using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("stats/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;

        var data = new
        {
            totalUsers = await db.Users.CountAsync(),
            totalItems = await db.Items.CountAsync(),
            activeItems = await db.Items.CountAsync(i => i.Status == ItemStatus.Active),
            pendingReports = await db.ReportLogs.CountAsync(r => r.Status == ReportStatus.Pending),
            todayNewUsers = await db.Users.CountAsync(u => u.CreatedAt >= todayStart),
            todayNewItems = await db.Items.CountAsync(i => i.CreatedAt >= todayStart),
            todayTransactions = await db.Transactions.CountAsync(t => t.CreatedAt >= todayStart)
        };

        return Ok(new { code = 0, data });
    }

    [HttpGet("stats/reports")]
    public async Task<IActionResult> GetReportStats()
    {
        var stats = await db.ReportLogs
            .GroupBy(r => r.ReasonType)
            .Select(g => new { reason = (int)g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new { code = 0, data = stats });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.ReportLogs
            .Where(r => r.Status == ReportStatus.Pending)
            .OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync();
        var reports = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.ReporterId,
                r.TargetId,
                reason = (int)r.ReasonType,
                r.Description,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { code = 0, data = new { reports, totalCount, page, pageSize } });
    }

    [HttpPatch("reports/{id:guid}")]
    public async Task<IActionResult> HandleReport(Guid id, [FromBody] HandleReportDTO dto)
    {
        var adminId = User.GetUserId();
        var report = await db.ReportLogs.FindAsync(id);
        if (report is null)
            return NotFound(new { code = 4004, message = "举报不存在" });

        if (dto.Accept)
            report.Accept(adminId, dto.Note);
        else
            report.Dismiss(adminId, dto.Note);

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = "处理完成" });
    }

    [HttpPatch("users/{id:guid}/ban")]
    public async Task<IActionResult> ToggleBan(Guid id, [FromBody] ToggleBanDTO dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        if (dto.Ban) user.Ban(); else user.Unban();
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = dto.Ban ? "已封禁" : "已解封" });
    }

    [HttpPost("users/{id:guid}/credit")]
    public async Task<IActionResult> AdjustCredit(Guid id, [FromBody] AdjustCreditDTO dto)
    {
        var adminId = User.GetUserId();
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { code = 4004, message = "用户不存在" });

        var log = user.RecordCreditChange(dto.Delta, dto.Reason, adminId);
        db.CreditLogs.Add(log);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, data = new { user.CreditScore } });
    }
}

public sealed record HandleReportDTO(bool Accept, string? Note);

public sealed record ToggleBanDTO(bool Ban);

public sealed record AdjustCreditDTO(int Delta, string Reason);
