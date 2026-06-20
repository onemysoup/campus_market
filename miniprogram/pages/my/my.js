/**
 * 个人中心页
 * onShow 动态刷新用户信息、信用分、认证等级
 */

const profileApi = require('../../api/profile');
const { AUTH_LEVEL_MAP, CAMPUS_AREA_MAP } = require('../../utils/constants');

Page({
  data: {
    isLoggedIn: false,
    user: {},
    // 扩展信息
    creditScore: 0,
    creditTier: '',
    authLevel: 0,
    authLevelLabel: '未认证',
    authLevelColor: '#94a3b8',
    campusLabel: '',
    // UI
    fallback: 'https://dummyimage.com/120x120/e2e8f0/64748b&text=U',
    loading: false
  },

  /**
   * 每次页面显示时刷新数据（关键：切回页面时信用分可能已变化）
   */
  onShow() {
    this.refreshUserData();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshUserData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 刷新用户数据（登录态 + 远端数据）
   */
  async refreshUserData() {
    const app = getApp();
    const { isLoggedIn, userInfo, authLevel } = app.globalData;

    if (!isLoggedIn || !userInfo) {
      this.setData({
        isLoggedIn: false,
        user: {},
        creditScore: 0,
        creditTier: '',
        authLevel: 0,
        authLevelLabel: '未认证',
        authLevelColor: '#94a3b8',
        campusLabel: ''
      });
      return;
    }

    // 先用本地缓存快速渲染
    this.setData({
      isLoggedIn: true,
      user: userInfo,
      authLevel: authLevel,
      authLevelLabel: AUTH_LEVEL_MAP[authLevel]?.label || '未认证',
      authLevelColor: AUTH_LEVEL_MAP[authLevel]?.color || '#94a3b8'
    });

    // 再从远端拉取最新信用分
    try {
      const userId = userInfo.userId;
      if (userId) {
        const creditData = await profileApi.getCredit(userId);
        this.setData({
          creditScore: creditData.creditScore || 0,
          creditTier: this.getCreditTierLabel(creditData.creditTier)
        });

        // 同步更新本地缓存
        userInfo.creditScore = creditData.creditScore;
        wx.setStorageSync('userInfo', userInfo);
      }
    } catch (error) {
      console.error('[My] refresh credit error:', error);
    }
  },

  /**
   * 信用等级标签
   */
  getCreditTierLabel(tier) {
    const tierMap = {
      0: '信用一般',
      1: '信用良好',
      2: '信用优秀',
      3: '信用极佳'
    };
    return tierMap[tier] || '信用一般';
  },

  // ==================== 页面跳转 ====================

  goOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' });
  },

  goMyGoods() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders?tab=publish' });
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders?tab=favor' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  /**
   * 编辑资料（跳转注册页的邮箱验证/密码设置）
   */
  onEditProfile() {
    wx.showActionSheet({
      itemList: ['绑定邮箱认证', '设置安全密码', '修改昵称头像'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            wx.navigateTo({ url: '/pages/register/register?step=email' });
            break;
          case 1:
            wx.navigateTo({ url: '/pages/register/register?step=password' });
            break;
          case 2:
            this.updateNicknameFlow();
            break;
        }
      }
    });
  },

  /**
   * 修改昵称流程
   */
  updateNicknameFlow() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: this.data.user.nickname || '请输入新昵称',
      success: async (res) => {
        if (!res.confirm) return;
        const nickname = res.content?.trim();
        if (!nickname) {
          wx.showToast({ title: '昵称不能为空', icon: 'none' });
          return;
        }
        // 后端暂无更新昵称接口，先更新本地
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = nickname;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ 'user.nickname': nickname });
        wx.showToast({ title: '昵称已更新', icon: 'success' });
      }
    });
  },

  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.onLogout();
          this.setData({
            isLoggedIn: false,
            user: {},
            creditScore: 0,
            creditTier: '',
            authLevel: 0,
            authLevelLabel: '未认证',
            authLevelColor: '#94a3b8',
            campusLabel: ''
          });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  }
});
