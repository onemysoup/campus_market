using CAUSecondHand.Domain.DTOs;
using FluentValidation;

namespace CAUSecondHand.WebAPI.Validators;

public sealed class CreateRequestDTOValidator : AbstractValidator<CreateRequestDTO>
{
    public CreateRequestDTOValidator()
    {
        RuleFor(x => x.Title).Length(1, 50);
        When(x => x.MaxPrice.HasValue,
            () => RuleFor(x => x.MaxPrice!.Value).GreaterThan(0));
    }
}
