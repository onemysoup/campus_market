using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.DTOs;

public sealed record SellerBriefVO(
    Guid UserId,
    string Nickname,
    string? AvatarUrl,
    AuthLevel AuthLevel)
{
    public static SellerBriefVO FromEntity(User seller) => new(
        seller.Id, seller.Nickname, seller.AvatarUrl, seller.AuthLevel);
}

public sealed record ItemCardVO
{
    public required Guid ItemId { get; init; }
    public required string Title { get; init; }
    public required decimal Price { get; init; }
    public string? FirstImage { get; init; }
    public ItemCategory Category { get; init; }
    public ConditionLevel ConditionLevel { get; init; }
    public CampusArea CampusArea { get; init; }
    public ItemStatus Status { get; init; }
    public int ViewCount { get; init; }
    public DateTime CreatedAt { get; init; }

    public static ItemCardVO FromEntity(Item item) => new()
    {
        ItemId = item.Id,
        Title = item.Title,
        Price = item.Price,
        FirstImage = item.Images.Count > 0 ? item.Images[0] : null,
        Category = item.Category,
        ConditionLevel = item.ConditionLevel,
        CampusArea = item.CampusArea,
        Status = item.Status,
        ViewCount = item.ViewCount,
        CreatedAt = item.CreatedAt
    };
}

public sealed record ItemDetailVO
{
    public required Guid ItemId { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required decimal Price { get; init; }
    public bool IsNegotiable { get; init; }
    public bool IsRental { get; init; }
    public string? RentalRate { get; init; }
    public decimal? Deposit { get; init; }
    public ItemCategory Category { get; init; }
    public ConditionLevel ConditionLevel { get; init; }
    public CampusArea CampusArea { get; init; }
    public string? DeliveryPoint { get; init; }
    public required List<string> Images { get; init; }
    public ItemStatus Status { get; init; }
    public int ViewCount { get; init; }
    public bool IsExpired { get; init; }
    public DateTime CreatedAt { get; init; }
    public required SellerBriefVO Seller { get; init; }
    public bool IsFavorited { get; init; }
    public bool CanBuy { get; init; }

    public static ItemDetailVO FromEntity(Item item, SellerBriefVO seller,
        bool isFavorited, bool canBuy) => new()
        {
            ItemId = item.Id,
            Title = item.Title,
            Description = item.Description,
            Price = item.Price,
            IsNegotiable = item.IsNegotiable,
            IsRental = item.IsRental,
            RentalRate = item.RentalRate,
            Deposit = item.Deposit,
            Category = item.Category,
            ConditionLevel = item.ConditionLevel,
            CampusArea = item.CampusArea,
            DeliveryPoint = item.DeliveryPoint,
            Images = [.. item.Images],
            Status = item.Status,
            ViewCount = item.ViewCount,
            IsExpired = item.IsExpired(),
            CreatedAt = item.CreatedAt,
            Seller = seller,
            IsFavorited = isFavorited,
            CanBuy = canBuy
        };
}

public sealed record ItemPublishDTO(
    string Title,
    string Description,
    decimal Price,
    ItemCategory Category,
    ConditionLevel ConditionLevel,
    List<string> Images,
    CampusArea CampusArea,
    bool IsNegotiable = true,
    bool IsRental = false,
    string? RentalRate = null,
    decimal? Deposit = null);

public sealed record ItemEditDTO(
    string? Title,
    string? Description,
    decimal? Price,
    ItemCategory? Category,
    ConditionLevel? ConditionLevel,
    List<string>? Images,
    CampusArea? CampusArea,
    string? DeliveryPoint,
    bool? IsRental = null,
    string? RentalRate = null,
    decimal? Deposit = null);

public sealed record ItemStatusChangeDTO(ItemStatus Status);

public sealed record ItemQuery(
    string? Keyword,
    ItemCategory? Category,
    ConditionLevel? ConditionLevel,
    CampusArea? CampusArea,
    ItemStatus? Status,
    decimal? MinPrice,
    decimal? MaxPrice,
    int Page = 1,
    int PageSize = 20);
