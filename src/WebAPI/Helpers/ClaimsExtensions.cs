using CAUSecondHand.Domain.Enums;
using System.Security.Claims;

namespace CAUSecondHand.WebAPI.Helpers;

public static class ClaimsExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? user.FindFirst("sub")?.Value;
        return Guid.TryParse(value, out var id) ? id : Guid.Empty;
    }

    public static Domain.Enums.AuthLevel GetAuthLevel(this ClaimsPrincipal user)
    {
        var value = user.FindFirst("authLevel")?.Value;
        return int.TryParse(value, out var level) ? (Domain.Enums.AuthLevel)level : Domain.Enums.AuthLevel.L0;
    }
}
