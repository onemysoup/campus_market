using Microsoft.AspNetCore.SignalR;

namespace CAUSecondHand.WebAPI.Hubs;

public sealed class ChatHub(ILogger<ChatHub> logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Context.UserIdentifier is { } userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
#pragma warning disable CA1848
            logger.LogDebug("SignalR 用户加入: {UserId}", userId);
#pragma warning restore CA1848
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
#pragma warning disable CA1848
            logger.LogWarning(exception, "SignalR 连接异常断开");
#pragma warning restore CA1848

        await base.OnDisconnectedAsync(exception);
    }
}
