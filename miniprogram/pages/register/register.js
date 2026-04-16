const api = require('../../api/index');

Page({
  data: {
    mode: 'register',
    roles: [
      { value: 'buyer', label: '买家' },
      { value: 'seller', label: '卖家' }
    ],
    roleIndex: 0,
    form: {
      nickname: '',
      phone: '',
      password: '',
      student_id: '',
      college: ''
    },
    reset: {
      phone: '',
      code: '',
      newPassword: ''
    }
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value.trim() });
  },

  onResetInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`reset.${key}`]: e.detail.value.trim() });
  },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },

  async onRegister() {
    try {
      const payload = {
        ...this.data.form,
        role: this.data.roles[this.data.roleIndex].value
      };
      await api.register(payload);
      wx.showToast({ title: '注册成功，请登录', icon: 'none' });
      wx.navigateTo({ url: '/pages/login/login' });
    } catch (error) {
    }
  },

  async onReset() {
    try {
      await api.resetPassword(this.data.reset);
      wx.showToast({ title: '密码修改成功', icon: 'success' });
      wx.navigateTo({ url: '/pages/login/login' });
    } catch (error) {
    }
  }
});
