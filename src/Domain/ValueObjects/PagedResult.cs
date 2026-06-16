namespace CAUSecondHand.Domain.ValueObjects;

public readonly record struct PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);
