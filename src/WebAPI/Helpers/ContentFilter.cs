namespace CAUSecondHand.WebAPI.Helpers;

/// <summary>
/// 违规关键词过滤（SRS F3.3.3 / SDD MonitorService）：拦截代写代考、非面交（快递/邮寄）等
/// 高度疑似违规或脱离校内面交场景的内容。简单 NLP 规则，命中即拒绝发布。
/// </summary>
public static class ContentFilter
{
    private static readonly string[] BannedKeywords =
    [
        "代写", "代考", "代做", "代课", "代上课", "代签",
        "快递", "邮寄", "包邮", "发货",
        "刷单", "兼职", "招嫖", "贷款", "博彩", "赌博", "外围"
    ];

    /// <summary>命中返回违规词，否则返回 null。</summary>
    public static string? FindBanned(params string?[] texts)
    {
        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text))
                continue;
            foreach (var word in BannedKeywords)
                if (text.Contains(word, StringComparison.OrdinalIgnoreCase))
                    return word;
        }
        return null;
    }
}
