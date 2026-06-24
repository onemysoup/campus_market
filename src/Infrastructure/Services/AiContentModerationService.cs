using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace CAUSecondHand.Infrastructure.Services;

/// <summary>AI 内容审核输入：用于商品标题/描述、聊天文本等场景。</summary>
public sealed record ContentModerationInput(string Scene, IReadOnlyList<string> Texts);

public interface IAiContentModerator
{
    Task<string?> FindViolationAsync(ContentModerationInput input, CancellationToken ct = default);
}

/// <summary>
/// 可选 LLM 内容审核。未配置时返回 null，由本地关键词过滤兜底。
/// 兼容 OpenAI Chat Completions 风格接口，便于在 .env 中填 endpoint/key/model。
/// </summary>
public sealed class AiContentModerationService(
    HttpClient httpClient,
    IOptions<AiOptions> options) : IAiContentModerator
{
    public async Task<string?> FindViolationAsync(ContentModerationInput input, CancellationToken ct = default)
    {
        var opt = options.Value;
        var endpoint = string.IsNullOrWhiteSpace(opt.ModerationEndpoint)
            ? opt.Endpoint
            : opt.ModerationEndpoint;

        if (!opt.Enabled || string.IsNullOrWhiteSpace(opt.ApiKey) || string.IsNullOrWhiteSpace(endpoint))
            return null;

        var text = string.Join("\n", input.Texts.Where(t => !string.IsNullOrWhiteSpace(t)).Take(5));
        if (string.IsNullOrWhiteSpace(text))
            return null;

        try
        {
            var request = new
            {
                model = string.IsNullOrWhiteSpace(opt.ModerationModel)
                    ? (string.IsNullOrWhiteSpace(opt.Model) ? "gpt-4o-mini" : opt.Model)
                    : opt.ModerationModel,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = "你是校园二手平台内容审核助手。只判断是否包含辱骂、色情、暴力、违禁交易、代写代考、诈骗、非校内面交诱导等风险。安全则只返回 OK；违规则只返回最短的违规词或原因。"
                    },
                    new
                    {
                        role = "user",
                        content = $"场景：{input.Scene}\n待审核文本：\n{text}"
                    }
                }
            };

            using var msg = new HttpRequestMessage(HttpMethod.Post, endpoint);
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
                .GetString()
                ?.Trim();

            if (string.IsNullOrWhiteSpace(content)
                || content.Equals("OK", StringComparison.OrdinalIgnoreCase)
                || content.Equals("安全", StringComparison.OrdinalIgnoreCase))
                return null;

            return content.Length > 30 ? content[..30] : content;
        }
        catch
        {
            return null;
        }
    }
}
