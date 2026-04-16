const api = require('../../api/index');

const roleMap = {
  buyer: '买家',
  seller: '卖家',
  admin: '管理员'
};

Page({
  data: {
    user: {},
    roleLabel: '',
    fallback: 'https://dummyimage.com/120x120/e2e8f0/64748b&text=U'
  },

  onShow() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ user: {}, roleLabel: '' });
      return;
    }
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const profile = await api.getProfile();
      wx.setStorageSync('userInfo', profile);
      this.setData({ user: profile, roleLabel: roleMap[profile.role] || '' });
    } catch (error) {
    }
  },

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

  onEditProfile() {
    const user = this.data.user;
    if (!user.id) {
      this.goLogin();
      return;
    }

    wx.showModal({
      title: '编辑提示',
      content: '请在弹窗里依次更新昵称和学院',
      success: (res) => {
        if (res.confirm) {
          this.updateProfileFlow();
        }
      }
    });
  },

  updateProfileFlow() {
    wx.showModal({
      title: '更新昵称',
      editable: true,
      placeholderText: this.data.user.nickname || '请输入昵称',
      success: async (res) => {
        if (!res.confirm) return;
        const nickname = res.content || this.data.user.nickname;
        wx.showModal({
          title: '更新学院',
          editable: true,
          placeholderText: this.data.user.college || '请输入学院',
          success: async (r2) => {
            if (!r2.confirm) return;
            try {
              await api.updateProfile({ nickname, college: r2.content || this.data.user.college });
              wx.showToast({ title: '更新成功', icon: 'success' });
              this.loadProfile();
            } catch (error) {
            }
          }
        });
      }
    });
  },

  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    this.setData({ user: {}, roleLabel: '' });
    wx.showToast({ title: '已退出', icon: 'none' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});
