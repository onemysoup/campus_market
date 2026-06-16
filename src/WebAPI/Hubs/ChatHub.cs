using Microsoft.AspNetCore.SignalR;

namespace CAUSecondHand.WebAPI.Hubs;

public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{Context.UserIdentifier}");
        await base.OnConnectedAsync();
    }

    public async Task SendMessage(Guid sessionId, Guid receiverId, string encryptedContent)
    {
        await Clients.Group($"user:{receiverId}").SendAsync("ReceiveMessage",
            sessionId, encryptedContent, DateTime.UtcNow);
    }
}
