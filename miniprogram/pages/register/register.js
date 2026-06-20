/**
 * 注册/邮箱验证页
 * 功能：邮箱绑定（发送验证码 + 验证）、设置密码、重置密码
 */

const { authApi } = require('../../api');
const { AUTH_LEVEL_MAP } = require('../../utils/constants');

Page({
  data: {
    mode: 'email',          // email | password | reset
    // 邮箱验证表单
    email: '',
    emailCode: '',
    // 密码表单
    password: '',
    confirmPassword: '',
    // 重置密码表单
    resetEmail: '',
    resetCode: '',
    resetNewPassword: '',
    // 倒计时
    countdown: 0,
    countdownText: '发送验证码',
    canSendCode: true,
    // 状态
    loading: false,
    // 用户当前认证等级
    authLevel: 0
  },

  timer: null,

  onLoad(options) {
    // 从登录页跳转时可能带参数
    if (options.step === 'email') {
      this.setData({ mode: 'email' });
    }
    this.loadAuthLevel();
  },

  onUnload() {
    // 页面销毁时清除定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  /**
   * 加载当前用户认证等级
   */
  loadAuthLevel() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ authLevel: userInfo.authLevel || 0 });
    }
  },

  // ==================== 模式切换 ====================

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode });
  },

  // ==================== 输入处理 ====================

  onEmailInput(e) {
    this.setData({ email: e.detail.value.trim() });
  },

  onEmailCodeInput(e) {
    this.setData({ emailCode: e.detail.value.trim() });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  onResetEmailInput(e) {
    this.setData({ resetEmail: e.detail.value.trim() });
  },

  onResetCodeInput(e) {
    this.setData({ resetCode: e.detail.value.trim() });
  },

  onResetNewPasswordInput(e) {
    this.setData({ resetNewPassword: e.detail.value });
  },

  // ==================== 邮箱验证流程 ====================

  /**
   * 发送验证码（含60秒倒计时）
   */
  async onSendCode() {
    const { email, canSendCode } = this.data;

    if (!canSendCode) return;

    // 校验邮箱格式
    if (!email) {
      wx.showToast({ title: '请输入邮箱', icon: 'none' });
      return;
    }

    if (!email.endsWith('@cau.edu.cn')) {
      wx.showToast({ title: '请使用 @cau.edu.cn 邮箱', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '发送中' });
      await authApi.sendCode(email);
      wx.hideLoading();

      wx.showToast({ title: '验证码已发送', icon: 'success' });

      // 启动60秒倒计时
      this.startCountdown();
    } catch (error) {
      wx.hideLoading();
      console.error('[Register] sendCode error:', error);
    }
  },

  /**
   * 启动60秒倒计时
   */
  startCountdown() {
    this.setData({ countdown: 60, canSendCode: false });

    this.timer = setInterval(() => {
      const { countdown } = this.data;
      if (countdown <= 1) {
        clearInterval(this.timer);
        this.timer = null;
        this.setData({
          countdown: 0,
          countdownText: '发送验证码',
          canSendCode: true
        });
      } else {
        const next = countdown - 1;
        this.setData({
          countdown: next,
          countdownText: `${next}秒后重发`
        });
      }
    }, 1000);
  },

  /**
   * 提交邮箱验证
   */
  async onVerifyEmail() {
    const { email, emailCode } = this.data;

    if (!email) {
      wx.showToast({ title: '请输入邮箱', icon: 'none' });
      return;
    }

    if (!emailCode) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      const result = await authApi.verifyEmail(email, emailCode);

      // 更新本地认证等级
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.authLevel = result.authLevel || 1;
      wx.setStorageSync('userInfo', userInfo);

      wx.showToast({ title: '邮箱验证成功', icon: 'success' });

      // 更新页面状态
      this.setData({ authLevel: result.authLevel || 1 });

      // 如果还没设置密码，引导设置
      if (result.authLevel >= 1) {
        setTimeout(() => {
          this.setData({ mode: 'password' });
        }, 1500);
      }
    } catch (error) {
      console.error('[Register] verifyEmail error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ==================== 设置密码 ====================

  async onSetPassword() {
    const { password, confirmPassword } = this.data;

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      await authApi.setPassword(password);

      wx.showToast({ title: '密码设置成功', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[Register] setPassword error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ==================== 重置密码 ====================

  async onSendResetCode() {
    const { resetEmail } = this.data;

    if (!resetEmail) {
      wx.showToast({ title: '请输入邮箱', icon: 'none' });
      return;
    }

    if (!resetEmail.endsWith('@cau.edu.cn')) {
      wx.showToast({ title: '请使用 @cau.edu.cn 邮箱', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '发送中' });
      await authApi.sendCode(resetEmail);
      wx.hideLoading();

      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this.startCountdown();
    } catch (error) {
      wx.hideLoading();
      console.error('[Register] sendResetCode error:', error);
    }
  },

  async onResetPassword() {
    const { resetEmail, resetCode, resetNewPassword } = this.data;

    if (!resetEmail || !resetCode || !resetNewPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (resetNewPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      await authApi.resetPassword(resetEmail, resetCode, resetNewPassword);

      wx.showToast({ title: '密码重置成功', icon: 'success' });

      setTimeout(() => {
        this.setData({ mode: 'email' });
      }, 1500);
    } catch (error) {
      console.error('[Register] resetPassword error:', error);
    } finally {
      this.setData({ loading: false });
    }
  }
});
