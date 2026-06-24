/**
 * 微信订阅消息授权工具
 * 模板 ID 未配置时自动跳过，避免本地开发报错。
 */

const { SUBSCRIBE_TEMPLATE_IDS } = require('./constants');

function getTemplateIds(keys = []) {
  return keys
    .map(key => SUBSCRIBE_TEMPLATE_IDS[key])
    .filter(id => typeof id === 'string' && id.trim());
}

function requestSubscribe(keys = []) {
  const tmplIds = getTemplateIds(keys);
  if (tmplIds.length === 0 || !wx.requestSubscribeMessage) {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: resolve,
      fail: (error) => {
        console.warn('[Subscribe] requestSubscribeMessage failed:', error);
        resolve(error || {});
      }
    });
  });
}

module.exports = {
  requestSubscribe
};
