using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Domain.ValueObjects;

namespace CAUSecondHand.Domain.Entities;

public sealed class Request
{
    private Request() { }

    public Request(Guid buyerId, string title, decimal? maxPrice,
        bool isUrgent, ResourceType resourceType, CampusArea campusArea,
        CollegeTag? targetCollege = null)
    {
        Id = Guid.NewGuid();
        BuyerId = buyerId;
        Title = title;
        MaxPrice = maxPrice;
        IsUrgent = isUrgent;
        ResourceType = resourceType;
        CampusArea = campusArea;
        TargetCollege = targetCollege;
        MatchingCount = 0;
        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7));
        CreatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid BuyerId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public decimal? MaxPrice { get; private set; }
    public bool IsUrgent { get; private set; }
    public ResourceType ResourceType { get; private set; }
    public CampusArea CampusArea { get; private set; }
    public CollegeTag? TargetCollege { get; private set; }
    public int MatchingCount { get; private set; }
    public DateOnly ExpiryDate { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsExpired() => ExpiryDate < DateOnly.FromDateTime(DateTime.UtcNow);

    public bool CanRenew() => !IsExpired();

    public Result Renew()
    {
        if (IsExpired())
            return Result.Failure("求购帖已过期，无法续期");

        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7));
        return Result.Success();
    }

    public void IncrementMatchingCount() => MatchingCount++;
}
