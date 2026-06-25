using CAUSecondHand.WebAPI.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/files")]
public class FilesController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    // 仅对静态位图合成水印；动图 gif 直接原样保存，避免破坏动画
    private static readonly HashSet<string> WatermarkExtensions = [".jpg", ".jpeg", ".png", ".webp"];

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

        // 读入内存后对静态图合成「CAU 二手交易专用」半透明水印（失败安全：异常回退原图）
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer);
        var bytes = buffer.ToArray();
        if (WatermarkExtensions.Contains(ext))
            bytes = ImageWatermarker.Apply(bytes);

        await System.IO.File.WriteAllBytesAsync(filePath, bytes);

        // 返回完整可访问 URL（含协议与主机），避免前端拿到相对路径无法显示图片
        var url = $"{Request.Scheme}://{Request.Host}/uploads/{fileName}";
        return Ok(new { code = 0, data = new { url } });
    }
}
