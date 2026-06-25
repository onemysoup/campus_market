using CAUSecondHand.Domain.Enums;

namespace CAUSecondHand.Domain.Entities;

// 行为埋点（DDD 6.15 t_event_log）：支撑页面点击、日活跃、功能入口点击等统计。高频写入表，不设外键。
public sealed class EventLog
{
    private EventLog() { }

    public EventLog(Guid? userId, string eventType, string? pageCode,
        Guid? itemId, Guid? requestId, CampusArea? campusArea)
    {
        UserId = userId == Guid.Empty ? null : userId;
        EventType = eventType;
        PageCode = pageCode;
        ItemId = itemId;
        RequestId = requestId;
        CampusArea = campusArea;
        CreatedAt = DateTime.UtcNow;
    }

    public long Id { get; private set; }
    public Guid? UserId { get; private set; }
    public string EventType { get; private set; } = string.Empty;
    public string? PageCode { get; private set; }
    public Guid? ItemId { get; private set; }
    public Guid? RequestId { get; private set; }
    public CampusArea? CampusArea { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
