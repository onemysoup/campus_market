using CAUSecondHand.Domain.DTOs;
using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        var report = new ReportLog(reporterId, dto.TargetId, dto.ReasonType,
            dto.EvidenceImages ?? [], dto.Description);

        db.ReportLogs.Add(report);
        await db.SaveChangesAsync();

        return Ok(new { code = 0, message = "举报已提交" });
    }
}
