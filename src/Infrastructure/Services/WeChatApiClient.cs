using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CAUSecondHand.Infrastructure.Services;

public sealed partial class WeChatApiClient(
    HttpClient http,
    IOptions<WeChatOptions> options,
    IMemoryCache cache,
    ILogger<WeChatApiClient> logger) : IWeChatApiClient
{
    public async Task<WeChatSession?> Code2SessionAsync(string code)
    {
        var url = $"https://api.weixin.qq.com/sns/jscode2session" +
                  $"?appid={options.Value.AppId}&secret={options.Value.AppSecret}" +
                  $"&js_code={code}&grant_type=authorization_code";

        var result = await http.GetFromJsonAsync<WeChatSessionResponse>(url);
        if (result is null || result.Errcode != 0
            || string.IsNullOrWhiteSpace(result.OpenId)
            || string.IsNullOrWhiteSpace(result.SessionKey))
            return null;

        return new WeChatSession(result.OpenId, result.SessionKey, result.UnionId);
    }

    public async Task<bool> SendSubscribeMessageAsync(
        SubscribeMessage message,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(options.Value.AppId)
            || string.IsNullOrWhiteSpace(options.Value.AppSecret)
            || string.IsNullOrWhiteSpace(message.OpenId)
            || string.IsNullOrWhiteSpace(message.TemplateId))
            return false;

        var accessToken = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(accessToken))
            return false;

        var payload = new
        {
            touser = message.OpenId,
            template_id = message.TemplateId,
            page = message.Page,
            data = message.Data.ToDictionary(
                kv => kv.Key,
                kv => new { value = Truncate(kv.Value, 20) })
        };

        var response = await http.PostAsJsonAsync(
            $"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={accessToken}",
            payload,
            cancellationToken);
        var result = await response.Content.ReadFromJsonAsync<WeChatCommonResponse>(
            cancellationToken: cancellationToken);

        if (result is { Errcode: 0 })
            return true;

        LogSubscribeMessageFailed(logger, result?.Errcode ?? -1, result?.Errmsg);
        return false;
    }

    private async Task<string?> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        const string cacheKey = "wechat-access-token";
        if (cache.TryGetValue(cacheKey, out string? cachedToken)
            && !string.IsNullOrWhiteSpace(cachedToken))
            return cachedToken;

        var url = $"https://api.weixin.qq.com/cgi-bin/token" +
                  $"?grant_type=client_credential&appid={options.Value.AppId}" +
                  $"&secret={options.Value.AppSecret}";
        var result = await http.GetFromJsonAsync<WeChatAccessTokenResponse>(
            url, cancellationToken);
        if (result is null || result.Errcode != 0
            || string.IsNullOrWhiteSpace(result.AccessToken))
        {
            LogAccessTokenFailed(logger, result?.Errcode ?? -1, result?.Errmsg);
            return null;
        }

        cache.Set(cacheKey, result.AccessToken,
            TimeSpan.FromSeconds(Math.Max(60, result.ExpiresIn - 300)));
        return result.AccessToken;
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    [LoggerMessage(EventId = 1, Level = LogLevel.Warning,
        Message = "WeChat subscribe message failed: {Errcode} {Errmsg}")]
    private static partial void LogSubscribeMessageFailed(
        ILogger logger, int errcode, string? errmsg);

    [LoggerMessage(EventId = 2, Level = LogLevel.Warning,
        Message = "WeChat access token failed: {Errcode} {Errmsg}")]
    private static partial void LogAccessTokenFailed(
        ILogger logger, int errcode, string? errmsg);
}

internal sealed record WeChatSessionResponse(
    [property: JsonPropertyName("openid")] string? OpenId,
    [property: JsonPropertyName("session_key")] string? SessionKey,
    [property: JsonPropertyName("unionid")] string? UnionId,
    [property: JsonPropertyName("errcode")] int Errcode,
    [property: JsonPropertyName("errmsg")] string? Errmsg);

internal sealed record WeChatAccessTokenResponse(
    [property: JsonPropertyName("access_token")] string? AccessToken,
    [property: JsonPropertyName("expires_in")] int ExpiresIn,
    [property: JsonPropertyName("errcode")] int Errcode,
    [property: JsonPropertyName("errmsg")] string? Errmsg);

internal sealed record WeChatCommonResponse(
    [property: JsonPropertyName("errcode")] int Errcode,
    [property: JsonPropertyName("errmsg")] string? Errmsg);

public sealed class WeChatOptions
{
    public const string SectionName = "WeChat";
    public string AppId { get; init; } = string.Empty;
    public string AppSecret { get; init; } = string.Empty;
    public SubscribeTemplateOptions SubscribeTemplates { get; init; } = new();
}

public sealed class SubscribeTemplateOptions
{
    public string RequestResponse { get; init; } = string.Empty;
    public string RequestMatch { get; init; } = string.Empty;
    public string PurchaseSuccess { get; init; } = string.Empty;
}
