/**
 * 个人中心页
 * onShow 动态刷新用户信息、信用分、认证等级
 */

const authApi = require('../../api/auth');
const profileApi = require('../../api/profile');
const { AUTH_LEVEL_MAP, CAMPUS_AREA_MAP } = require('../../utils/constants');

Page({
  data: {
    isLoggedIn: false,
    user: {},
    isAdmin: false,
    // 扩展信息
    creditScore: 0,
    creditTier: '',
    authLevel: 0,
    authLevelLabel: '未认证',
    authLevelColor: '#94a3b8',
    campusLabel: '',
    // UI
    fallback: '',
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
    const { isLoggedIn, userInfo } = app.globalData;

    if (!isLoggedIn || !userInfo) {
      this.setData({
        isLoggedIn: false,
        user: {},
        isAdmin: false,
        creditScore: 0,
        creditTier: '',
        authLevel: 0,
        authLevelLabel: '未认证',
        authLevelColor: '#94a3b8',
        campusLabel: ''
      });
      return;
    }

    // 从 userInfo 中获取 authLevel（优先使用本地存储的最新值）
    const authLevel = userInfo.authLevel || app.globalData.authLevel || 0;
    const roleType = userInfo.roleType || app.globalData.roleType || '';
    const isAdmin = roleType === 'Admin';

    // 先用本地缓存快速渲染
    this.setData({
      isLoggedIn: true,
      user: userInfo,
      isAdmin: isAdmin,
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
    wx.navigateTo({ url: '/pages/my-goods/my-goods' });
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/my-favorites/my-favorites' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goAdminUsers() {
    wx.navigateTo({ url: '/pages/admin/admin?tab=users' });
  },

  goAdminItems() {
    wx.navigateTo({ url: '/pages/admin/admin?tab=items' });
  },

  goAdminReports() {
    wx.navigateTo({ url: '/pages/admin/admin?tab=reports' });
  },

  goAdminVerifications() {
    wx.navigateTo({ url: '/pages/admin/admin?tab=verifications' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  /**
   * 编辑资料
   */
  onEditProfile() {
    const actions = [
      { label: '修改昵称', handler: () => this.updateNicknameFlow() },
      { label: '修改头像', handler: () => this.updateAvatarFlow() }
    ];

    if ((this.data.authLevel || 0) < 1) {
      actions.push({
        label: '绑定邮箱认证',
        handler: () => wx.navigateTo({ url: '/pages/register/register?step=email' })
      });
    }

    if ((this.data.authLevel || 0) >= 1 && (this.data.authLevel || 0) < 2) {
      actions.push({
        label: 'L2 高级认证',
        handler: () => wx.navigateTo({ url: '/pages/register/register?step=student' })
      });
    }

    actions.push({
      label: '设置安全密码',
      handler: () => wx.navigateTo({ url: '/pages/register/register?step=password' })
    });

    if ((this.data.authLevel || 0) >= 1) {
      actions.push({
        label: '重置安全密码',
        handler: () => wx.navigateTo({ url: '/pages/register/register?step=securityReset' })
      });
    }

    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: (res) => {
        const action = actions[res.tapIndex];
        if (action) action.handler();
      }
    });
  },
  /**
   * 修改头像流程
   */
  updateAvatarFlow() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (chooseRes) => {
        const tempFilePath = chooseRes.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...', mask: true });
        try {
          // 保存为本地持久化文件（Mock 方案）
          let avatarUrl = tempFilePath;
          try {
            avatarUrl = await new Promise((resolve, reject) => {
              wx.saveFile({
                tempFilePath,
                success: (res) => resolve(res.savedFilePath),
                fail: (err) => reject(err)
              });
            });
          } catch (e) {
            console.warn('[My] saveFile failed, using temp path:', e);
          }

          // 调用后端接口更新头像
          const result = await authApi.updateProfile({ avatarUrl });

          const newAvatarUrl = result.avatarUrl || avatarUrl;

          // 更新本地存储
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.avatarUrl = newAvatarUrl;
          wx.setStorageSync('userInfo', userInfo);

          // 更新全局状态
          const app = getApp();
          if (app.globalData.userInfo) {
            app.globalData.userInfo.avatarUrl = newAvatarUrl;
          }

          // 更新页面显示（使用整个 user 对象更新）
          this.setData({
            user: { ...this.data.user, avatarUrl: newAvatarUrl }
          });
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } catch (error) {
          console.error('[My] updateAvatar error:', error);
          wx.showToast({ title: '更新失败', icon: 'none' });
        } finally {
          wx.hideLoading();
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

        try {
          // 调用后端接口更新昵称
          const result = await authApi.updateProfile({ nickname });

          // 更新本地存储
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.nickname = result.nickname || nickname;
          wx.setStorageSync('userInfo', userInfo);

          // 更新全局状态
          const app = getApp();
          if (app.globalData.userInfo) {
            app.globalData.userInfo.nickname = result.nickname || nickname;
          }

          this.setData({ 'user.nickname': result.nickname || nickname });
          wx.showToast({ title: '昵称已更新', icon: 'success' });
        } catch (error) {
          console.error('[My] updateNickname error:', error);
        }
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

