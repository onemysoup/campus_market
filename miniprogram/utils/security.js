/**
 * 安全密码使用偏好。
 * 后端将安全密码作为可选二次确认；具体哪些操作弹安全密码由用户本地开关控制。
 */

const DEFAULT_PREFS = {
  purchase: false,
  cancelOrder: false,
  verifyPickup: false
};

function getUserId() {
  try {
    const userInfo = wx.getStorageSync('userInfo') || {};
    return userInfo.userId || 'guest';
  } catch (e) {
    return 'guest';
  }
}

function getSecurityPrefsKey() {
  return `securityPrefs_${getUserId()}`;
}

function getSecurityPrefs() {
  const saved = wx.getStorageSync(getSecurityPrefsKey()) || {};
  return {
    ...DEFAULT_PREFS,
    ...saved
  };
}

function setSecurityPrefs(next) {
  const prefs = {
    ...DEFAULT_PREFS,
    ...next
  };
  wx.setStorageSync(getSecurityPrefsKey(), prefs);
  return prefs;
}

function toggleSecurityPref(key) {
  const prefs = getSecurityPrefs();
  return setSecurityPrefs({
    ...prefs,
    [key]: !prefs[key]
  });
}

function promptSecurityPassword(title = '安全验证') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText: '请输入安全密码',
      confirmText: '确认',
      confirmColor: '#0f766e',
      success: (res) => {
        if (!res.confirm) {
          resolve(null);
          return;
        }
        const password = (res.content || '').trim();
        if (!password) {
          wx.showToast({ title: '请输入安全密码', icon: 'none' });
          resolve(null);
          return;
        }
        resolve(password);
      },
      fail: () => resolve(null)
    });
  });
}

async function maybePromptSecurityPassword(key, title) {
  const prefs = getSecurityPrefs();
  if (!prefs[key]) return '';
  return promptSecurityPassword(title);
}

module.exports = {
  getSecurityPrefs,
  setSecurityPrefs,
  toggleSecurityPref,
  maybePromptSecurityPassword
};
