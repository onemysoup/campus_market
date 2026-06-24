using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Domain.ValueObjects;

namespace CAUSecondHand.Domain.Entities;

public sealed class Item
{
    private readonly List<string> _images = [];

    private Item() { }

    public Item(Guid sellerId, string title, string description, decimal price,
        ItemCategory category, ConditionLevel condition, List<string> images,
        CampusArea campusArea, bool isRental = false,
        string? rentalRate = null, decimal? deposit = null,
        CollegeTag? targetCollege = null)
    {
        Id = Guid.NewGuid();
        SellerId = sellerId;
        Title = title;
        Description = description;
        Price = price;
        Category = category;
        ConditionLevel = condition;
        _images = images;
        CampusArea = campusArea;
        TargetCollege = targetCollege;
        IsRental = isRental;
        RentalRate = rentalRate;
        Deposit = deposit;
        Status = ItemStatus.Draft;
        ViewCount = 0;
        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid SellerId { get; private set; }
    public User? Seller { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public bool IsNegotiable { get; private set; } = true;
    public bool IsFree => Price == 0;
    public bool IsRental { get; private set; }
    public string? RentalRate { get; private set; }
    public decimal? Deposit { get; private set; }
    public ItemCategory Category { get; private set; }
    public ConditionLevel ConditionLevel { get; private set; }
    public CampusArea CampusArea { get; private set; }
    public CollegeTag? TargetCollege { get; private set; }
    public string? DeliveryPoint { get; private set; }
    public IReadOnlyList<string> Images => _images.AsReadOnly();
    public ItemStatus Status { get; private set; }
    public int ViewCount { get; private set; }
    public DateOnly ExpiryDate { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsExpired() => ExpiryDate < DateOnly.FromDateTime(DateTime.UtcNow);

    public bool IsAvailableForBuying() => Status == ItemStatus.Active && !IsExpired();

    public bool CanBeEditedBy(Guid userId) => SellerId == userId;

    public void IncrementViewCount() => ViewCount++;

    public Result TransitionTo(ItemStatus target)
    {
        var allowed = (Status, target) switch
        {
            (ItemStatus.Draft, ItemStatus.Active) => true,
            (ItemStatus.Draft, ItemStatus.Inactive) => true,
            (ItemStatus.Active, ItemStatus.Reserved) => true,
            (ItemStatus.Active, ItemStatus.Inactive) => true,
            (ItemStatus.Reserved, ItemStatus.Active) => true,
            (ItemStatus.Reserved, ItemStatus.Sold) => true,
            (ItemStatus.Reserved, ItemStatus.Inactive) => true,
            (ItemStatus.Inactive, ItemStatus.Active) => true,
            _ => false
        };

        if (!allowed)
            return Result.Failure($"不能从 {Status} 转换到 {target}");

        Status = target;

        if (target == ItemStatus.Active)
            ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));

        return Result.Success();
    }

    public void Edit(string? title, string? description, decimal? price,
        ItemCategory? category, ConditionLevel? condition, List<string>? images,
        CampusArea? campusArea, string? deliveryPoint,
        bool? isRental = null, string? rentalRate = null, decimal? deposit = null,
        CollegeTag? targetCollege = null, bool clearCollege = false)
    {
        if (title != null) Title = title;
        if (description != null) Description = description;
        if (price.HasValue) Price = price.Value;
        if (category.HasValue) Category = category.Value;
        if (condition.HasValue) ConditionLevel = condition.Value;
        if (images != null) { _images.Clear(); _images.AddRange(images); }
        if (campusArea.HasValue) CampusArea = campusArea.Value;
        if (clearCollege) TargetCollege = null;
        else if (targetCollege.HasValue) TargetCollege = targetCollege.Value;
        if (deliveryPoint != null) DeliveryPoint = deliveryPoint;
        if (isRental.HasValue) IsRental = isRental.Value;
        if (isRental == true)
        {
            Deposit = deposit;
            RentalRate = rentalRate;
        }
        else if (isRental == false)
        {
            Deposit = null;
            RentalRate = null;
        }
        else
        {
            if (deposit.HasValue) Deposit = deposit.Value;
            if (rentalRate != null) RentalRate = rentalRate;
        }
    }
}
