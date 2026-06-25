using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record CreateRequestDTO(
    string Title,
    decimal? MaxPrice,
    bool IsUrgent,
    ResourceType ResourceType,
    CampusArea CampusArea,
    CollegeTag? TargetCollege = null);

/// <summary>"我有它"响应请求：卖家用一件自己在售的商品响应求购帖。</summary>
public sealed record RespondRequestDTO(
    Guid ItemId,
    string? Message);

public sealed record RequestVO
{
    public required Guid RequestId { get; init; }
    public required string Title { get; init; }
    public decimal? MaxPrice { get; init; }
    public bool IsUrgent { get; init; }
    public ResourceType ResourceType { get; init; }
    public CampusArea CampusArea { get; init; }
    public CollegeTag? TargetCollege { get; init; }
    public int MatchingCount { get; init; }
    public DateOnly ExpiryDate { get; init; }
    public DateTime CreatedAt { get; init; }
    public required Guid BuyerId { get; init; }

    public static RequestVO FromEntity(Request request) => new()
    {
        RequestId = request.Id,
        Title = request.Title,
        MaxPrice = request.MaxPrice,
        IsUrgent = request.IsUrgent,
        ResourceType = request.ResourceType,
        CampusArea = request.CampusArea,
        TargetCollege = request.TargetCollege,
        MatchingCount = request.MatchingCount,
        ExpiryDate = request.ExpiryDate,
        CreatedAt = request.CreatedAt,
        BuyerId = request.BuyerId
    };
}
