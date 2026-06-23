using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CAUSecondHand.WebAPI.Controllers;

[ApiController]
[Route("api/v1/files")]
[Authorize(Policy = "AuthLevelL0")]
public class FilesController(IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { code = 4000, message = "请选择文件" });

        // 限制文件大小 10MB
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { code = 4000, message = "文件大小不能超过10MB" });

        // 限制文件类型
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { code = 4000, message = "只支持 jpg/png/gif/webp 格式" });

        // 生成唯一文件名
        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";

        // 保存到 wwwroot/images
        var imagesPath = Path.Combine(env.WebRootPath, "images");
        if (!Directory.Exists(imagesPath))
            Directory.CreateDirectory(imagesPath);

        var filePath = Path.Combine(imagesPath, fileName);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 返回访问 URL
        var url = $"{Request.Scheme}://{Request.Host}/images/{fileName}";

        return Ok(new
        {
            code = 0,
            data = new { url }
        });
    }
}
