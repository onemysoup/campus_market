/**
 * 注册/邮箱验证页
 * 功能：邮箱绑定、设置安全密码、L2认证申请、重置登录密码
 */

const authApi = require('../../api/auth');
const filesApi = require('../../api/files');
const { getBaseURL } = require('../../utils/request');

const VERIFICATION_STATUS_TEXT = {
  None: '未提交',
  Pending: '审核中',
  Approved: '已通过',
  Rejected: '已驳回'
};

Page({
  data: {
    mode: 'email',          // email | password | securityReset | student | reset
    // 邮箱验证表单
    email: '',
    emailCode: '',
    // 密码表单
    password: '',
    confirmPassword: '',
    // 重置安全密码表单
    securityResetEmail: '',
    securityResetCode: '',
    securityResetNewPassword: '',
    securityResetConfirmPassword: '',
    // L2 高级认证表单
    realName: '',
    studentId: '',
    certificateImageUrl: '',
    studentCardPreviewUrl: '',
    verificationStatus: 'None',
    verificationStatusText: '未提交',
    verificationAdminNote: '',
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
    // 忘记密码/重置密码允许未登录访问
    if (options.step === 'reset') {
      this.setData({ mode: 'reset' });
      return;
    }

    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再进行操作',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    // 从登录页/账号设置跳转时可能带参数
    if (['email', 'password', 'securityReset', 'student', 'reset'].includes(options.step)) {
      this.setData({ mode: options.step });
    }
    this.loadAuthLevel();

    if (this.data.mode === 'student') {
      this.loadStudentVerification();
    }
  },

  onUnload() {
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

    if (mode === 'student') {
      this.loadStudentVerification();
    }
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

  onRealNameInput(e) {
    this.setData({ realName: e.detail.value.trim() });
  },

  onStudentIdInput(e) {
    this.setData({ studentId: e.detail.value.trim() });
  },

  onSecurityResetEmailInput(e) {
    this.setData({ securityResetEmail: e.detail.value.trim() });
  },

  onSecurityResetCodeInput(e) {
    this.setData({ securityResetCode: e.detail.value.trim() });
  },

  onSecurityResetNewPasswordInput(e) {
    this.setData({ securityResetNewPassword: e.detail.value });
  },

  onSecurityResetConfirmPasswordInput(e) {
    this.setData({ securityResetConfirmPassword: e.detail.value });
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

      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.authLevel = result.authLevel || 1;
      wx.setStorageSync('userInfo', userInfo);

      if (result.token) {
        wx.setStorageSync('token', result.token);
        const app = getApp();
        if (app.globalData) {
          app.globalData.token = result.token;
          app.globalData.authLevel = result.authLevel || 1;
          app.globalData.userInfo = userInfo;
        }
      }

      wx.showToast({ title: '邮箱验证成功', icon: 'success' });
      this.setData({ authLevel: result.authLevel || 1 });

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

  // ==================== 设置安全密码 ====================

  async onSetPassword() {
    const { password, confirmPassword } = this.data;

    if (!password) {
      wx.showToast({ title: '请输入安全密码', icon: 'none' });
      return;
    }

    if (!/^\d{6}$/.test(password)) {
      wx.showToast({ title: '安全密码需为6位数字', icon: 'none' });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      await authApi.setSecurityPassword(password);

      wx.showToast({ title: '安全密码设置成功', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[Register] setSecurityPassword error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ==================== 重置安全密码 ====================

  async onSendSecurityResetCode() {
    const { securityResetEmail } = this.data;

    if (!securityResetEmail) {
      wx.showToast({ title: '请输入绑定邮箱', icon: 'none' });
      return;
    }

    if (!securityResetEmail.endsWith('@cau.edu.cn')) {
      wx.showToast({ title: '请使用 @cau.edu.cn 邮箱', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '发送中' });
      await authApi.sendCode(securityResetEmail);
      wx.hideLoading();
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this.startCountdown();
    } catch (error) {
      wx.hideLoading();
      console.error('[Register] sendSecurityResetCode error:', error);
    }
  },

  async onResetSecurityPassword() {
    const {
      securityResetEmail,
      securityResetCode,
      securityResetNewPassword,
      securityResetConfirmPassword
    } = this.data;

    if (!securityResetEmail || !securityResetCode || !securityResetNewPassword || !securityResetConfirmPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!/^\d{6}$/.test(securityResetNewPassword)) {
      wx.showToast({ title: '安全密码需为6位数字', icon: 'none' });
      return;
    }

    if (securityResetNewPassword !== securityResetConfirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      await authApi.resetSecurityPassword(securityResetEmail, securityResetCode, securityResetNewPassword);

      wx.showToast({ title: '安全密码重置成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[Register] resetSecurityPassword error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },
  // ==================== L2 高级认证 ====================

  async loadStudentVerification() {
    if ((this.data.authLevel || 0) < 1) return;

    try {
      const result = await authApi.getStudentVerification();
      const status = result.status || 'None';
      const authLevel = result.authLevel ?? this.data.authLevel;

      if (result.token) {
        wx.setStorageSync('token', result.token);
      }

      if (authLevel !== this.data.authLevel || result.token) {
        this.syncAuthLevel(authLevel, result.token);
      }

      this.setData({
        authLevel,
        realName: result.realName || this.data.realName,
        studentId: result.studentId || this.data.studentId,
        certificateImageUrl: result.certificateImageUrl || '',
        studentCardPreviewUrl: this.buildFileUrl(result.certificateImageUrl || ''),
        verificationStatus: status,
        verificationStatusText: VERIFICATION_STATUS_TEXT[status] || '未提交',
        verificationAdminNote: result.adminNote || ''
      });
    } catch (error) {
      console.error('[Register] loadStudentVerification error:', error);
    }
  },

  buildFileUrl(url) {
    if (!url) return '';
    if (/^(https?:|wxfile:|http:\/\/tmp|blob:)/.test(url)) return url;
    return `${getBaseURL()}${url}`;
  },

  syncAuthLevel(authLevel, token) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.authLevel = authLevel;
    wx.setStorageSync('userInfo', userInfo);

    if (token) {
      wx.setStorageSync('token', token);
    }

    const app = getApp();
    if (app.globalData) {
      app.globalData.authLevel = authLevel;
      app.globalData.userInfo = userInfo;
      if (token) app.globalData.token = token;
    }
  },

  chooseStudentCardImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ studentCardPreviewUrl: tempFilePath, loading: true });

        try {
          const uploadResult = await filesApi.uploadImage(tempFilePath);
          this.setData({ certificateImageUrl: uploadResult.url || '' });
          wx.showToast({ title: '照片已上传', icon: 'success' });
        } catch (error) {
          console.error('[Register] upload student card error:', error);
          this.setData({ studentCardPreviewUrl: '', certificateImageUrl: '' });
        } finally {
          this.setData({ loading: false });
        }
      }
    });
  },

  previewStudentCardImage() {
    const { studentCardPreviewUrl } = this.data;
    if (!studentCardPreviewUrl) return;
    wx.previewImage({ urls: [studentCardPreviewUrl], current: studentCardPreviewUrl });
  },

  async onSubmitStudentVerification() {
    const { authLevel, realName, studentId, certificateImageUrl, verificationStatus } = this.data;

    if (authLevel < 1) {
      wx.showToast({ title: '请先完成邮箱认证', icon: 'none' });
      return;
    }

    if (verificationStatus === 'Pending') {
      wx.showToast({ title: '申请正在审核中', icon: 'none' });
      return;
    }

    if (!realName) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    if (!studentId || studentId.length < 4) {
      wx.showToast({ title: '请输入正确学号', icon: 'none' });
      return;
    }

    if (!certificateImageUrl) {
      wx.showToast({ title: '请上传学生证照片', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });
      const result = await authApi.submitStudentVerification({
        realName,
        studentId,
        certificateImageUrl
      }) || {};

      this.setData({
        verificationStatus: result.status || 'Pending',
        verificationStatusText: '审核中',
        verificationAdminNote: ''
      });
      wx.showToast({ title: '已提交审核', icon: 'success' });
    } catch (error) {
      console.error('[Register] submitStudentVerification error:', error);
      if (error && error.code === 4000 && /已有审核中的申请/.test(error.message || '')) {
        await this.loadStudentVerification();
      }
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

      wx.showToast({ title: '登录密码重置成功', icon: 'success' });

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
