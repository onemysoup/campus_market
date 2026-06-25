using CAUSecondHand.Domain.DTOs;
using FluentValidation;

namespace CAUSecondHand.WebAPI.Validators;

public sealed class ItemPublishDTOValidator : AbstractValidator<ItemPublishDTO>
{
    public ItemPublishDTOValidator()
    {
        RuleFor(x => x.Title).Length(1, 40);
        RuleFor(x => x.Description).Length(1, 2000);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Images)
            .Must(x => x is null || x.Count <= 9)
            .WithMessage("商品图片最多上传 9 张");
    }
}

public sealed class ItemEditDTOValidator : AbstractValidator<ItemEditDTO>
{
    public ItemEditDTOValidator()
    {
        When(x => x.Title != null, () => RuleFor(x => x.Title!).Length(1, 40));
        When(x => x.Description != null, () => RuleFor(x => x.Description!).Length(1, 2000));
        When(x => x.Price.HasValue, () => RuleFor(x => x.Price!.Value).GreaterThanOrEqualTo(0));
    }
}
