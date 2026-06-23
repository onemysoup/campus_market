/**
 * 校园二手平台 - 小程序入口
 * 全局登录态管理与生命周期
 */

const { AUTH_LEVEL_MAP } = require('./utils/constants');

App({
  globalData: {
    token: '',
    userInfo: null,
    authLevel: 0,
    isLoggedIn: false
  },

  onLaunch() {
    this.restoreLoginState();
    this.checkTokenValidity();
  },

  /**
   * 从本地存储恢复登录态
   */
  restoreLoginState() {
    try {
      const token = wx.getStorageSync('token') || '';
      const userInfo = wx.getStorageSync('userInfo') || null;

      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = !!token;
      this.globalData.authLevel = userInfo ? (userInfo.authLevel || 0) : 0;
    } catch (e) {
      console.error('[App] restoreLoginState error:', e);
    }
  },

  /**
   * 检查 Token 有效性（静默，不弹窗）
   */
  checkTokenValidity() {
    if (!this.globalData.token) return;

    // Token 存在即认为有效，实际请求时后端会校验
    // 若后端返回 401，request.js 会自动处理跳转登录
  },

  /**
   * 登录成功后更新全局状态
   * @param {Object} loginData - 后端返回的登录数据
   */
  onLoginSuccess(loginData) {
    const { token, userId, nickname, avatarUrl, authLevel, roleType, isNewUser } = loginData;

    const userInfo = {
      userId,
      nickname: nickname || `用户${userId.slice(-4)}`,
      avatarUrl: avatarUrl || '',
      authLevel: authLevel || 0,
      roleType: roleType || 'Student',
      authLevelLabel: AUTH_LEVEL_MAP[authLevel]?.label || '未认证',
      canPublish: AUTH_LEVEL_MAP[authLevel]?.canPublish || false,
      isAdmin: roleType === 'Admin'
    };

    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    this.globalData.authLevel = authLevel;
    this.globalData.roleType = roleType;

    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);

    return { userInfo, isNewUser };
  },

  /**
   * 退出登录
   */
  onLogout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.authLevel = 0;

    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },

  /**
   * 检查是否已登录
   * @param {boolean} showToast - 是否提示未登录
   * @returns {boolean}
   */
  checkLogin(showToast = true) {
    if (this.globalData.isLoggedIn) return true;
    if (showToast) {
      wx.showToast({ title: '请先登录', icon: 'none' });
    }
    return false;
  },

  /**
   * 检查是否有发布权限（AuthLevel >= L1）
   * @returns {boolean}
   */
  checkPublishPermission() {
    if (!this.checkLogin()) return false;

    const level = this.globalData.authLevel;
    if (level < 1) {
      wx.showModal({
        title: '权限不足',
        content: '发布商品需要完成邮箱认证，是否前往认证？',
        confirmText: '去认证',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/register/register?step=email' });
          }
        }
      });
      return false;
    }
    return true;
  },

  /**
   * 获取当前用户 ID
   * @returns {string|null}
   */
  getUserId() {
    return this.globalData.userInfo?.userId || null;
  }
});
