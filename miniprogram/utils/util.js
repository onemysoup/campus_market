/**
 * 工具函数模块
 * 保留向后兼容，新增函数从 constants.js 引入
 */

const {
  CATEGORY_LIST,
  CONDITION_LIST,
  ITEM_STATUS_MAP,
  getNameById,
  formatPrice,
  formatTime,
  ensureLogin
} = require('./constants');

// ==================== 向后兼容导出 ====================

// 旧版 GOODS_STATUS_MAP（兼容，新代码请用 ITEM_STATUS_MAP）
const GOODS_STATUS_MAP = {
  available: '在售',
  sold: '已售出',
  offline: '已下架'
};

// 旧版 ORDER_STATUS_MAP（兼容）
const ORDER_STATUS_MAP = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

// ==================== 登录检查（增强版） ====================

/**
 * 检查登录状态，未登录则跳转
 * @param {boolean} redirect - 是否跳转登录页
 * @returns {boolean}
 */
function checkLogin(redirect = true) {
  const app = getApp();
  if (app && app.checkLogin) {
    return app.checkLogin(redirect);
  }
  // Fallback
  const token = wx.getStorageSync('token');
  if (!token) {
    if (redirect) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateTo({ url: '/pages/login/login' });
    }
    return false;
  }
  return true;
}

// ==================== 其他工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
function throttle(fn, delay = 300) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

module.exports = {
  // 常量（向后兼容）
  CATEGORY_LIST,
  CONDITION_LIST,
  GOODS_STATUS_MAP,
  ORDER_STATUS_MAP,
  ITEM_STATUS_MAP,

  // 函数
  getNameById,
  formatPrice,
  formatTime,
  ensureLogin: checkLogin,
  checkLogin,
  generateId,
  debounce,
  throttle
};
