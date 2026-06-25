using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;

namespace CAUSecondHand.WebAPI.Helpers;

/// <summary>
/// 商品图片水印（SRS 686 / SDD ImageService）：在右下角合成「CAU 二手交易专用」半透明水印，
/// 防止图片被校外爬虫抓取用于诈骗。
/// 完全失败安全：任何异常（缺中文字体、解码失败、动图等）都回退返回原图字节，绝不破坏上传。
/// </summary>
public static class ImageWatermarker
{
    private const string WatermarkText = "CAU 二手交易专用";

    // 候选中文字体族名（Linux 运行镜像通常安装 WenQuanYi / Noto CJK；Windows 开发机有微软雅黑/黑体）。
    private static readonly string[] CjkFontCandidates =
    [
        "WenQuanYi Zen Hei", "WenQuanYi Micro Hei", "Noto Sans CJK SC",
        "Noto Sans CJK", "Source Han Sans SC", "Microsoft YaHei", "SimHei", "PingFang SC"
    ];

    private static readonly Lazy<FontFamily?> WatermarkFontFamily = new(ResolveFontFamily);

    /// <summary>对图片字节合成水印；失败时原样返回输入字节。</summary>
    public static byte[] Apply(byte[] original)
    {
        var family = WatermarkFontFamily.Value;
        if (family is null)
            return original; // 运行环境无可用中文字体，跳过水印（不影响上传）

        try
        {
            using var image = Image.Load(original);
            var format = image.Metadata.DecodedImageFormat ?? PngFormat.Instance;

            // 字号随图片宽度自适应，限定在 14~48px
            var fontSize = Math.Clamp(image.Width / 22f, 14f, 48f);
            var font = family.Value.CreateFont(fontSize, FontStyle.Regular);
            var padding = fontSize * 0.6f;

            var options = new RichTextOptions(font)
            {
                Origin = new PointF(image.Width - padding, image.Height - padding),
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Bottom
            };

            image.Mutate(ctx =>
            {
                // 先描一层深色阴影增强可读性，再叠白色半透明正文
                var shadow = new RichTextOptions(font)
                {
                    Origin = new PointF(image.Width - padding + 1.5f, image.Height - padding + 1.5f),
                    HorizontalAlignment = HorizontalAlignment.Right,
                    VerticalAlignment = VerticalAlignment.Bottom
                };
                ctx.DrawText(shadow, WatermarkText, Color.FromRgba(0, 0, 0, 90));
                ctx.DrawText(options, WatermarkText, Color.FromRgba(255, 255, 255, 170));
            });

            using var ms = new MemoryStream();
            image.Save(ms, format);
            return ms.ToArray();
        }
        catch
        {
            return original; // 任意失败都回退原图，保证上传可用
        }
    }

    private static FontFamily? ResolveFontFamily()
    {
        foreach (var name in CjkFontCandidates)
            if (SystemFonts.TryGet(name, out var family))
                return family;

        // 退一步：取系统里任意一个声称支持中文的字体族
        foreach (var family in SystemFonts.Families)
        {
            var n = family.Name;
            if (n.Contains("Hei", StringComparison.OrdinalIgnoreCase)
                || n.Contains("CJK", StringComparison.OrdinalIgnoreCase)
                || n.Contains("YaHei", StringComparison.OrdinalIgnoreCase)
                || n.Contains("Song", StringComparison.OrdinalIgnoreCase)
                || n.Contains("Ming", StringComparison.OrdinalIgnoreCase))
                return family;
        }

        return null;
    }
}
