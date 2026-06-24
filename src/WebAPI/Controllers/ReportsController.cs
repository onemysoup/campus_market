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
[Route("api/v1/reports")]
[Authorize(Policy = "AuthLevelL1")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> ReportUser([FromBody] ReportUserDTO dto)
    {
        var reporterId = User.GetUserId();
        if (reporterId == dto.TargetId)
            return BadRequest(new { code = 4000, message = "不能举报自己" });

        // 去重：同一举报人对同一对象若已有待处理举报，不允许重复提交（防刷举报）
        var hasPending = await db.ReportLogs.AnyAsync(r =>
            r.ReporterId == reporterId
            && r.TargetId == dto.TargetId
            && r.Status == ReportStatus.Pending);
        if (hasPending)
            return BadRequest(new { code = 4000, message = "你已举报过该用户，请勿重复举报，我们会尽快处理" });

        var report = new ReportLog(reporterId, dto.TargetId, dto.ReasonType,
            dto.EvidenceImages ?? [], dto.Description);

        db.ReportLogs.Add(report);
        await db.SaveChangesAsync();

        // 返回该对象当前累计的待处理举报数，便于前端/管理感知严重度
        var pendingCount = await db.ReportLogs.CountAsync(r =>
            r.TargetId == dto.TargetId && r.Status == ReportStatus.Pending);

        return Ok(new { code = 0, message = "举报已提交", data = new { pendingCount } });
    }
}
