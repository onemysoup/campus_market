namespace CAUSecondHand.Infrastructure.Services;

public interface IEmailSender
{
    Task SendVerificationCodeAsync(string email, string code);
}
