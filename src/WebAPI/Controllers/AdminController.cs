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
            pendingVerifications = await db.StudentVerificationApplications.CountAsync(a => a.Status == StudentVerificationStatus.Pending),
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

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Users.OrderByDescending(u => u.CreatedAt);
        var totalCount = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                userId = u.Id,
                u.Nickname,
                email = u.EmailAddress,
                studentId = u.StudentId,
                authLevel = (int)u.AuthLevel,
                roleType = u.RoleType.ToString(),
                u.CreditScore,
                u.IsBanned,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(new { code = 0, data = new { users, totalCount, page, pageSize } });
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

    [HttpGet("verifications")]
    public async Task<IActionResult> GetStudentVerifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? status = 0)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.StudentVerificationApplications.AsNoTracking();
        if (status.HasValue)
        {
            var targetStatus = (StudentVerificationStatus)status.Value;
            query = query.Where(a => a.Status == targetStatus);
        }

        var joinedQuery = from a in query
                          join u in db.Users.AsNoTracking() on a.UserId equals u.Id
                          orderby a.CreatedAt descending
                          select new
                          {
                              a.Id,
                              a.UserId,
                              u.Nickname,
                              email = u.EmailAddress,
                              currentAuthLevel = (int)u.AuthLevel,
                              a.RealName,
                              a.StudentId,
                              a.CertificateImageUrl,
                              status = a.Status.ToString(),
                              statusCode = (int)a.Status,
                              a.AdminNote,
                              a.CreatedAt,
                              a.ReviewedAt
                          };

        var totalCount = await joinedQuery.CountAsync();
        var applications = await joinedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { code = 0, data = new { applications, totalCount, page, pageSize } });
    }

    [HttpPatch("verifications/{id:guid}")]
    public async Task<IActionResult> HandleStudentVerification(Guid id, [FromBody] HandleStudentVerificationDTO dto)
    {
        var adminId = User.GetUserId();
        var application = await db.StudentVerificationApplications.FindAsync(id);
        if (application is null)
            return NotFound(new { code = 4004, message = "认证申请不存在" });

        if (application.Status != StudentVerificationStatus.Pending)
            return BadRequest(new { code = 4000, message = "该认证申请已处理" });

        var user = await db.Users.FindAsync(application.UserId);
        if (user is null)
            return NotFound(new { code = 4004, message = "申请用户不存在" });

        if (dto.Approve)
        {
            var duplicateApprovedUser = await db.Users
                .AnyAsync(u => u.Id != user.Id
                    && u.StudentId == application.StudentId
                    && u.AuthLevel >= AuthLevel.L2);
            if (duplicateApprovedUser)
                return BadRequest(new { code = 4000, message = "该学号已被其他用户认证" });

            application.Approve(adminId, dto.Note);
            user.VerifyStudent(application.StudentId);
        }
        else
        {
            application.Reject(adminId, dto.Note);
        }

        await db.SaveChangesAsync();
        return Ok(new { code = 0, message = dto.Approve ? "认证已通过" : "认证已驳回" });
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

public sealed record HandleStudentVerificationDTO(bool Approve, string? Note);

public sealed record ToggleBanDTO(bool Ban);

public sealed record AdjustCreditDTO(int Delta, string Reason);
