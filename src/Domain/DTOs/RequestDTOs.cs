using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record CreateRequestDTO(
    string Title,
    decimal? MaxPrice,
    bool IsUrgent,
    ResourceType ResourceType,
    CampusArea CampusArea);

public sealed record RequestVO
{
    public required Guid RequestId { get; init; }
    public required string Title { get; init; }
    public decimal? MaxPrice { get; init; }
    public bool IsUrgent { get; init; }
    public ResourceType ResourceType { get; init; }
    public CampusArea CampusArea { get; init; }
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
        MatchingCount = request.MatchingCount,
        ExpiryDate = request.ExpiryDate,
        CreatedAt = request.CreatedAt,
        BuyerId = request.BuyerId
    };
}
