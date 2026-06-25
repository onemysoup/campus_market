/**
 * 微信订阅消息授权工具
 * 模板 ID 未配置时自动跳过，避免本地开发报错。
 */

const { SUBSCRIBE_TEMPLATE_IDS } = require('./constants');

function getUserId() {
  try {
    const userInfo = wx.getStorageSync('userInfo') || {};
    return userInfo.userId || 'guest';
  } catch (e) {
    return 'guest';
  }
}

function getSubscribePrefsKey() {
  return `subscribePrefs_${getUserId()}`;
}

function getSubscribePrefs() {
  try {
    return wx.getStorageSync(getSubscribePrefsKey()) || {};
  } catch (e) {
    return {};
  }
}

function setSubscribePrefs(prefs) {
  try {
    wx.setStorageSync(getSubscribePrefsKey(), prefs || {});
  } catch (e) {
    console.warn('[Subscribe] save prefs failed:', e);
  }
}

function getTemplateIds(keys = []) {
  return keys
    .map(key => SUBSCRIBE_TEMPLATE_IDS[key])
    .filter(id => typeof id === 'string' && id.trim());
}

function requestSubscribe(keys = []) {
  const prefs = getSubscribePrefs();
  const activeKeys = [];
  const tmplIds = [];

  keys.forEach((key) => {
    const templateId = SUBSCRIBE_TEMPLATE_IDS[key];
    if (typeof templateId !== 'string' || !templateId.trim()) return;
    if (prefs[key] === 'accept' || prefs[key] === 'reject' || prefs[key] === 'ban') return;
    activeKeys.push(key);
    tmplIds.push(templateId);
  });

  if (tmplIds.length === 0 || !wx.requestSubscribeMessage) {
    return Promise.resolve(prefs);
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: (result) => {
        activeKeys.forEach((key, index) => {
          const templateId = tmplIds[index];
          const value = result[templateId];
          if (value === 'accept' || value === 'reject' || value === 'ban') {
            prefs[key] = value;
          }
        });
        setSubscribePrefs(prefs);
        resolve(result);
      },
      fail: (error) => {
        console.warn('[Subscribe] requestSubscribeMessage failed:', error);
        resolve(error || {});
      }
    });
  });
}

module.exports = {
  requestSubscribe,
  getSubscribePrefs
};
