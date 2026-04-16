const api = require('../../api/index');

Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async onSubmit() {
    const { phone, password } = this.data;
    if (!phone || !password) {
      wx.showToast({ title: '请填写手机号和密码', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      const data = await api.login({ phone, password });
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('userInfo', data.user);
      getApp().globalData.token = data.token;
      getApp().globalData.userInfo = data.user;
      wx.showToast({ title: '登录成功', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (error) {
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  async onWxLogin() {
    try {
      const codeRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      const data = await api.wxLogin({ wx_openid: codeRes.code });
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('userInfo', data.user);
      getApp().globalData.token = data.token;
      getApp().globalData.userInfo = data.user;
      wx.showToast({ title: '微信登录成功', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (error) {
      wx.showToast({ title: '微信登录失败', icon: 'none' });
    }
  }
});
