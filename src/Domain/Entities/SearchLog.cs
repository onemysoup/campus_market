using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

// 搜索日志（DDD 6.14 t_search_log）：支撑搜索关键词云与日聚合。高频写入表，不设外键。
public sealed class SearchLog
{
    private SearchLog() { }

    public SearchLog(Guid? userId, string keyword, CampusArea? campusArea, int resultCount)
    {
        UserId = userId == Guid.Empty ? null : userId;
        Keyword = keyword;
        CampusArea = campusArea;
        ResultCount = resultCount;
        CreatedAt = DateTime.UtcNow;
    }

    public long Id { get; private set; }
    public Guid? UserId { get; private set; }
    public string Keyword { get; private set; } = string.Empty;
    public CampusArea? CampusArea { get; private set; }
    public int ResultCount { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
