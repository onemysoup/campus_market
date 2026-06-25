using System.Net.Http.Json;
using System.Text.Json;
using CAUSecondHand.Domain.Enums;
using Microsoft.Extensions.Options;

namespace CAUSecondHand.Infrastructure.Services;

/// <summary>AI 辅助生成商品描述的输入（SRS F2.1.7）。</summary>
public sealed record AiDescribeInput(
    string Title,
    ItemCategory Category,
    ConditionLevel ConditionLevel,
    string? Keywords,
    IReadOnlyList<string> Images,
    CampusArea CampusArea,
    bool SupportCrossCampus,
    bool IsNegotiable,
    bool IsFree,
    bool IsRental,
    string? RentalRate,
    decimal? Deposit);

public interface IAiDescriptionGenerator
{
    Task<string> GenerateAsync(AiDescribeInput input, CancellationToken ct = default);
}

/// <summary>
/// AI 描述生成（SRS F2.1.7「预留接口」/ SDD「LLM AI 接口（预留）」）。
/// 配置了外部大模型时调用 OpenAI 兼容接口；未配置或调用失败时降级为本地规则生成，
/// 与 SDD 降级策略一致（AI 不可用时发布流程正常运行）。
/// </summary>
public sealed class AiDescriptionService(
    HttpClient httpClient,
    IOptions<AiOptions> options) : IAiDescriptionGenerator
{
    private const long MaxInlineImageBytes = 5 * 1024 * 1024;
    private const int MaxVisionImages = 1;

    private static readonly string[] CategoryNames =
        ["教材教辅", "数码电子", "生活用品", "运动户外", "服装鞋帽", "文具办公", "乐器器材", "票券卡类", "其他物品"];

    private static readonly string[] ConditionDescriptions =
    [
        "全新未拆封，外观与功能均无瑕疵",
        "几乎全新，仅轻微把玩痕迹，功能完好",
        "成色良好，有少量使用痕迹，不影响使用",
        "正常使用痕迹明显，功能正常",
        "有明显磨损或瑕疵，但仍可正常使用"
    ];

    public async Task<string> GenerateAsync(AiDescribeInput input, CancellationToken ct = default)
    {
        var opt = options.Value;
        if (opt.Enabled && !string.IsNullOrWhiteSpace(opt.ApiKey) && !string.IsNullOrWhiteSpace(opt.Endpoint))
        {
            try
            {
                return await CallLlmAsync(input, opt, ct);
            }
            catch
            {
                // 外部模型不可用时降级为本地生成（SDD：AI 不可用不影响发布流程）
            }
        }

        return BuildLocalDescription(input);
    }

    // 本地规则生成：始终可用，包含成色评估与规格/交易建议（SRS 要求 AI 描述含成色评估和规格建议）
    private static string BuildLocalDescription(AiDescribeInput input)
    {
        var categoryName = CategoryIndex(input.Category) is var ci && ci >= 0 && ci < CategoryNames.Length
            ? CategoryNames[ci] : "物品";
        var condIdx = (int)input.ConditionLevel;
        var conditionText = condIdx >= 0 && condIdx < ConditionDescriptions.Length
            ? ConditionDescriptions[condIdx] : "成色良好";

        var keywords = string.IsNullOrWhiteSpace(input.Keywords)
            ? string.Empty
            : $"主要特点：{input.Keywords.Trim()}。";
        var imageHint = input.Images.Count > 0 ? "已上传图片，可结合图片补充外观细节。" : string.Empty;
        var priceHint = BuildPriceHint(input);
        var tradeHint = BuildTradeHint(input.CampusArea, input.SupportCrossCampus);

        return
            $"【{input.Title.Trim()}】{categoryName}，{conditionText}。{keywords}"
            + imageHint
            + priceHint
            + $"诚信交易，{tradeHint}，当面验货。"
            + "有意者欢迎私聊议价，非诚勿扰～";
    }

    private async Task<string> CallLlmAsync(AiDescribeInput input, AiOptions opt, CancellationToken ct)
    {
        var prompt =
            $"请为校园二手交易平台生成一段简洁友好的商品描述（80字以内，含成色评估和规格建议，不要使用 Markdown）。"
            + $"标题：{input.Title}；分类：{(int)input.Category}；成色等级(0最好-4最差)：{(int)input.ConditionLevel}；"
            + $"关键词：{input.Keywords}；交易信息：{BuildPromptTradeRules(input)}；"
            + "必须严格遵守交易信息，不要写未勾选的跨校区、议价、赠送或租赁能力；"
            + (input.Images.Count > 0
                ? "已附商品图片。请优先结合图片中的外观、颜色、数量和磨损情况。"
                : string.Empty);

        var messages = input.Images.Count > 0
            ? new object[]
            {
                new { role = "system", content = "你是校园二手交易平台的商品文案助手。" },
                new { role = "user", content = await BuildVisionContentAsync(prompt, input.Images, ct) }
            }
            : new object[]
            {
                new { role = "system", content = "你是校园二手交易平台的商品文案助手。" },
                new { role = "user", content = prompt }
            };

        var request = new
        {
            model = string.IsNullOrWhiteSpace(opt.Model) ? "gpt-4o-mini" : opt.Model,
            messages
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, opt.Endpoint);
        msg.Headers.TryAddWithoutValidation("Authorization", $"Bearer {opt.ApiKey}");
        msg.Content = JsonContent.Create(request);

        using var resp = await httpClient.SendAsync(msg, ct);
        resp.EnsureSuccessStatusCode();

        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return string.IsNullOrWhiteSpace(content) ? BuildLocalDescription(input) : content.Trim();
    }

    private static async Task<object[]> BuildVisionContentAsync(
        string prompt,
        IReadOnlyList<string> images,
        CancellationToken ct)
    {
        var content = new List<object>
        {
            new { type = "text", text = prompt }
        };

        foreach (var image in images.Where(i => !string.IsNullOrWhiteSpace(i)).Take(MaxVisionImages))
        {
            var imageUrl = await ResolveImageUrlAsync(image, ct);
            content.Add(new
            {
                type = "image_url",
                image_url = new { url = imageUrl }
            });
        }

        return content.ToArray();
    }

    private static async Task<string> ResolveImageUrlAsync(string image, CancellationToken ct)
    {
        if (image.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return image;

        var uploadFileName = TryGetUploadFileName(image);
        if (uploadFileName is null)
            return image;

        foreach (var uploadsDir in GetUploadDirectories())
        {
            var filePath = Path.Combine(uploadsDir, uploadFileName);
            if (!File.Exists(filePath))
                continue;

            var fileInfo = new FileInfo(filePath);
            if (fileInfo.Length <= 0 || fileInfo.Length > MaxInlineImageBytes)
                return image;

            var bytes = await File.ReadAllBytesAsync(filePath, ct);
            return $"data:{GetMimeType(fileInfo.Extension)};base64,{Convert.ToBase64String(bytes)}";
        }

        return image;
    }

    private static string? TryGetUploadFileName(string image)
    {
        var path = image;
        if (Uri.TryCreate(image, UriKind.Absolute, out var uri))
            path = uri.LocalPath;

        path = Uri.UnescapeDataString(path).Replace('\\', '/');
        if (!path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return null;

        var fileName = Path.GetFileName(path);
        if (string.IsNullOrWhiteSpace(fileName))
            return null;

        var extension = Path.GetExtension(fileName);
        return IsSupportedInlineImage(extension) ? fileName : null;
    }

    private static IEnumerable<string> GetUploadDirectories()
    {
        yield return Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        yield return Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads");
    }

    private static bool IsSupportedInlineImage(string extension)
    {
        return extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".webp", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetMimeType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }

    private static string BuildPriceHint(AiDescribeInput input)
    {
        if (input.IsFree)
            return "0元赠送。";
        if (input.IsRental)
        {
            var rent = string.IsNullOrWhiteSpace(input.RentalRate)
                ? "租金面议"
                : $"租金{input.RentalRate.Trim()}";
            var deposit = input.Deposit.HasValue ? $"，押金{input.Deposit.Value:0.##}元" : string.Empty;
            return $"{rent}{deposit}。";
        }

        return input.IsNegotiable ? "价格可小刀。" : "价格不议。";
    }

    private static string BuildTradeHint(CampusArea campusArea, bool supportCrossCampus)
    {
        return (campusArea, supportCrossCampus) switch
        {
            (CampusArea.East, true) => "优先东校区交付，可协商跨校区",
            (CampusArea.West, true) => "优先西校区交付，可协商跨校区",
            (CampusArea.Both, _) => "支持东/西校区交付",
            (CampusArea.West, _) => "仅西校区交付",
            _ => "仅东校区交付"
        };
    }

    private static string BuildPromptTradeRules(AiDescribeInput input)
    {
        var kind = input.IsFree
            ? "0元赠送"
            : input.IsRental
                ? "租赁"
                : "二手出售";
        var negotiable = input.IsNegotiable && !input.IsFree && !input.IsRental
            ? "可议价"
            : "不可议价";
        var trade = BuildTradeHint(input.CampusArea, input.SupportCrossCampus);
        var rent = input.IsRental ? BuildPriceHint(input) : string.Empty;

        return $"{kind}；{negotiable}；{trade}；{rent}";
    }

    private static int CategoryIndex(ItemCategory category) => (int)category;
}

public sealed class AiOptions
{
    public const string SectionName = "Ai";

    public bool Enabled { get; init; }
    public string? Endpoint { get; init; }
    public string? ApiKey { get; init; }
    public string? Model { get; init; }
    public string? ModerationEndpoint { get; init; }
    public string? ModerationModel { get; init; }
}
