using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/files")]
public class FilesController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    [Authorize(Policy = "AuthLevelL1")]
    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { code = 4000, message = "请选择文件" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { code = 4000, message = "不支持的文件格式，仅支持 jpg/png/gif/webp" });

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        // 返回完整可访问 URL（含协议与主机），避免前端拿到相对路径无法显示图片
        var url = $"{Request.Scheme}://{Request.Host}/uploads/{fileName}";
        return Ok(new { code = 0, data = new { url } });
    }
}
