/**
 * 行为埋点上报 API
 * 对应后端: EventsController (POST /api/v1/events)
 * 用于页面点击量、功能入口点击等运营统计（DDD 6.15 t_event_log）。
 */

const { post } = require('../utils/request');

/**
 * 上报一次埋点事件。埋点失败不应影响用户主流程，故内部吞掉异常。
 * @param {string} eventType - 事件类型，如 PAGE_VIEW / ENTRY_CLICK
 * @param {string} pageCode  - 页面编码，如 requests / goods / profile
 * @param {Object} [extra]   - 可选 { itemId, requestId }
 */
function track(eventType, pageCode, extra = {}) {
  return post('/api/v1/events', {
    eventType,
    pageCode,
    itemId: extra.itemId || null,
    requestId: extra.requestId || null
  }).catch(() => {
    // 静默失败：埋点不影响业务
  });
}

module.exports = { track };
