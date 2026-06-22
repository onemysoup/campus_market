using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace CAUSecondHand.Infrastructure.Services;

public sealed class EmailSender(IOptions<SmtpOptions> options, ILogger<EmailSender> logger) : IEmailSender
{
    public async Task SendVerificationCodeAsync(string email, string code)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("CAU二手交易平台", options.Value.From));
        message.To.Add(new MailboxAddress("", email));
        message.Subject = "邮箱验证码";

        message.Body = new TextPart("plain")
        {
            Text = $"您的验证码是: {code}\n验证码有效期为10分钟。"
        };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(options.Value.Host, options.Value.Port,
                options.Value.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(options.Value.User, options.Value.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
#pragma warning disable CA1848
            logger.LogWarning(ex, "SMTP 发送验证码至 {Email} 失败", email);
#pragma warning restore CA1848
        }
    }
}

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";
    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 465;
    public bool UseSsl { get; init; } = true;
    public string User { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string From { get; init; } = string.Empty;
}
