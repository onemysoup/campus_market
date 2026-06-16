using CAUSecondHand.Domain.DTOs;
using FluentValidation;

namespace CAUSecondHand.WebAPI.Validators;

public sealed class SendCodeRequestValidator : AbstractValidator<SendCodeRequest>
{
    public SendCodeRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress()
            .Must(e => e.EndsWith("@cau.edu.cn", StringComparison.Ordinal));
    }
}

public sealed class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().Length(6);
    }
}

public sealed class SetPasswordRequestValidator : AbstractValidator<SetPasswordRequest>
{
    public SetPasswordRequestValidator()
    {
        RuleFor(x => x.Password).NotEmpty().Length(6, 50);
    }
}

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().Length(6);
        RuleFor(x => x.NewPassword).NotEmpty().Length(6, 50);
    }
}
