namespace CAUSecondHand.Infrastructure.Services;

public interface IWeChatApiClient
{
    Task<WeChatSession?> Code2SessionAsync(string code);
}

public sealed record WeChatSession(string OpenId, string SessionKey, string? UnionId);
