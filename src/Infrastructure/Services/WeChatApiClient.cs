using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CAUSecondHand.Infrastructure.Services;

public sealed class WeChatApiClient(HttpClient http, IOptions<WeChatOptions> options, ILogger<WeChatApiClient> logger) : IWeChatApiClient
{
    public async Task<WeChatSession?> Code2SessionAsync(string code)
    {
        var url = $"https://api.weixin.qq.com/sns/jscode2session" +
                  $"?appid={options.Value.AppId}&secret={options.Value.AppSecret}" +
                  $"&js_code={code}&grant_type=authorization_code";

        logger.LogInformation("请求微信 API: {Url}", url.Replace(options.Value.AppSecret, "***"));

        var result = await http.GetFromJsonAsync<WeChatSessionResponse>(url);

        logger.LogInformation("微信 API 响应: errcode={Errcode}, errmsg={Errmsg}, openid={OpenId}",
            result?.Errcode, result?.Errmsg, result?.OpenId);

        if (result is null || result.Errcode != 0
            || string.IsNullOrWhiteSpace(result.OpenId)
            || string.IsNullOrWhiteSpace(result.SessionKey))
            return null;

        return new WeChatSession(result.OpenId, result.SessionKey, result.UnionId);
    }
}

internal sealed record WeChatSessionResponse(
    [property: JsonPropertyName("openid")] string? OpenId,
    [property: JsonPropertyName("session_key")] string? SessionKey,
    [property: JsonPropertyName("unionid")] string? UnionId,
    [property: JsonPropertyName("errcode")] int Errcode,
    [property: JsonPropertyName("errmsg")] string? Errmsg);

public sealed class WeChatOptions
{
    public const string SectionName = "WeChat";
    public string AppId { get; init; } = string.Empty;
    public string AppSecret { get; init; } = string.Empty;
}
