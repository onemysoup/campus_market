namespace CAUSecondHand.Infrastructure.Services;

public interface IWeChatApiClient
{
    Task<WeChatSession?> Code2SessionAsync(string code);
    Task<bool> SendSubscribeMessageAsync(SubscribeMessage message, CancellationToken cancellationToken = default);
}

public sealed record WeChatSession(string OpenId, string SessionKey, string? UnionId);

public sealed record SubscribeMessage(
    string OpenId,
    string TemplateId,
    string Page,
    IReadOnlyDictionary<string, string> Data);
