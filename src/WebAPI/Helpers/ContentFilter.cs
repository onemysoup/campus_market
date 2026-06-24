namespace CAUSecondHand.WebAPI.Helpers;

/// <summary>
/// 违规关键词过滤（SRS F3.3.3 / SDD MonitorService）：拦截代写代考、非面交（快递/邮寄）等
/// 高度疑似违规或脱离校内面交场景的内容。简单 NLP 规则，命中即拒绝发布。
/// </summary>
public static class ContentFilter
{
    // 学术/非面交违规（原有）
    private static readonly string[] AcademicAndOffline =
    [
        "代写", "代考", "代做", "代课", "代上课", "代签",
        "快递", "邮寄", "包邮", "发货",
        "刷单", "兼职", "招嫖", "贷款", "博彩", "赌博", "外围"
    ];

    // 色情低俗
    private static readonly string[] Pornographic =
    [
        "约炮", "一夜情", "裸聊", "裸照", "情色", "色情", "成人影片",
        "黄片", "av资源", "性服务", "嫖娼", "卖淫", "援交"
    ];

    // 暴力/违禁品
    private static readonly string[] ViolenceAndContraband =
    [
        "枪支", "手枪", "弹药", "炸药", "雷管", "管制刀具", "毒品",
        "冰毒", "大麻", "摇头丸", "血腥", "凶器"
    ];

    // 政治敏感/违法宣传（基础词，生产建议接入微信内容安全 security.msgSecCheck 兜底）
    private static readonly string[] PoliticalSensitive =
    [
        "反动", "邪教", "颠覆国家", "分裂国家", "暴乱", "煽动", "法轮"
    ];

    private static readonly string[][] AllGroups =
    [
        AcademicAndOffline, Pornographic, ViolenceAndContraband, PoliticalSensitive
    ];

    /// <summary>命中返回违规词，否则返回 null。用于商品发布、私聊消息、交易评价等文本审核。</summary>
    public static string? FindBanned(params string?[] texts)
    {
        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text))
                continue;
            foreach (var group in AllGroups)
                foreach (var word in group)
                    if (text.Contains(word, StringComparison.OrdinalIgnoreCase))
                        return word;
        }
        return null;
    }
}
