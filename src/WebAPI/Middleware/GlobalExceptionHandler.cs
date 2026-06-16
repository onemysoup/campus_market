using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;

namespace CAUSecondHand.WebAPI.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        var (statusCode, code, message) = exception switch
        {
            BadHttpRequestException e => (StatusCodes.Status400BadRequest, 4000, e.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, 4001, "未授权访问"),
            KeyNotFoundException e => (StatusCodes.Status404NotFound, 4004, e.Message),
            _ => (StatusCodes.Status500InternalServerError, 5000, "系统内部错误")
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            code,
            message,
            data = (object?)null,
            traceId = Activity.Current?.Id ?? context.TraceIdentifier
        };

        await context.Response.WriteAsJsonAsync(response, ct);
        return true;
    }
}
