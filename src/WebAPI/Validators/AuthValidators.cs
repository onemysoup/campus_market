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


public sealed class SetSecurityPasswordRequestValidator : AbstractValidator<SetSecurityPasswordRequest>
{
    public SetSecurityPasswordRequestValidator()
    {
        RuleFor(x => x.Password).NotEmpty().Matches("^[0-9]{6}$")
            .WithMessage("安全密码必须是 6 位数字");
    }
}

public sealed class ResetSecurityPasswordRequestValidator : AbstractValidator<ResetSecurityPasswordRequest>
{
    public ResetSecurityPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().Length(6);
        RuleFor(x => x.NewPassword).NotEmpty().Matches("^[0-9]{6}$")
            .WithMessage("安全密码必须是 6 位数字");
    }
}
public sealed class SubmitStudentVerificationRequestValidator : AbstractValidator<SubmitStudentVerificationRequest>
{
    public SubmitStudentVerificationRequestValidator()
    {
        RuleFor(x => x.RealName).NotEmpty().Length(2, 50);
        RuleFor(x => x.StudentId).NotEmpty().Length(4, 32);
        RuleFor(x => x.CertificateImageUrl).NotEmpty().MaximumLength(500);
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

