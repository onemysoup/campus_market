/**
 * 登录页
 * 支持：微信一键登录（含新用户引导完善资料）
 */

const { authApi } = require('../../api');
const { CAMPUS_AREA_MAP } = require('../../utils/constants');

Page({
  data: {
    loading: false,
    // 新用户引导弹窗相关
    showGuide: false,
    guideNickname: '',
    guideAvatar: '',
    campusOptions: [
      { value: 0, label: '东校区' },
      { value: 1, label: '西校区' },
      { value: 2, label: '两校区' }
    ],
    campusIndex: 0,
    guideLoading: false
  },

  onLoad() {
    // 检查是否已登录，已登录则直接返回
    const token = wx.getStorageSync('token');
    if (token) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // ==================== 微信登录 ====================

  async onWxLogin() {
    if (this.data.loading) return;

    try {
      this.setData({ loading: true });

      // Step 1: 调用 wx.login 获取 code
      const loginRes = await this.wxLogin();
      const code = loginRes.code;

      // Step 2: 发送 code 到后端
      const result = await authApi.wxLogin(code);

      // Step 3: 判断是否新用户
      if (result.isNewUser) {
        // 新用户 → 引导完善资料
        this.setData({
          showGuide: true,
          guideNickname: result.nickname || '',
          guideAvatar: result.avatarUrl || '',
          // 暂存 token，引导完成后再正式存储
          _tempToken: result.token,
          _tempUserId: result.userId
        });
      } else {
        // 老用户 → 直接登录成功
        this.handleLoginSuccess(result);
      }
    } catch (error) {
      console.error('[Login] wxLogin error:', error);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 封装 wx.login 为 Promise
   */
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: (err) => {
          console.error('[wx.login] fail:', err);
          reject(new Error('获取微信登录凭证失败'));
        }
      });
    });
  },

  /**
   * 处理登录成功（老用户 + 新用户完成引导后）
   */
  handleLoginSuccess(loginData) {
    const app = getApp();
    const { userInfo, isNewUser } = app.onLoginSuccess(loginData);

    wx.showToast({
      title: isNewUser ? '注册成功' : '登录成功',
      icon: 'success'
    });

    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1000);
  },

  // ==================== 新用户引导 ====================

  /**
   * 输入昵称
   */
  onGuideNicknameInput(e) {
    this.setData({ guideNickname: e.detail.value });
  },

  /**
   * 选择头像（使用微信头像选择组件）
   */
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      this.setData({ guideAvatar: avatarUrl });
    }
  },

  /**
   * 选择校区
   */
  onCampusChange(e) {
    this.setData({ campusIndex: Number(e.detail.value) });
  },

  /**
   * 提交新用户资料
   */
  async onGuideSubmit() {
    const { guideNickname, guideAvatar, campusIndex, campusOptions, _tempToken } = this.data;

    // 校验
    if (!guideNickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    if (guideNickname.trim().length < 2) {
      wx.showToast({ title: '昵称至少2个字符', icon: 'none' });
      return;
    }

    try {
      this.setData({ guideLoading: true });

      // 临时存储 token 以便后续接口调用
      wx.setStorageSync('token', _tempToken);

      // 设置校区
      const campusArea = campusOptions[campusIndex].value;
      await authApi.setCampus(campusArea);

      // 构造登录数据（后端暂无更新昵称接口，使用本地数据）
      const loginData = {
        token: _tempToken,
        userId: this.data._tempUserId,
        nickname: guideNickname.trim(),
        avatarUrl: guideAvatar,
        authLevel: 0,
        isNewUser: true
      };

      this.handleLoginSuccess(loginData);
    } catch (error) {
      console.error('[Login] guide submit error:', error);
      wx.showToast({ title: '资料提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ guideLoading: false });
    }
  },

  /**
   * 跳过引导（使用默认资料）
   */
  onGuideSkip() {
    const loginData = {
      token: this.data._tempToken,
      userId: this.data._tempUserId,
      nickname: this.data.guideNickname || '',
      avatarUrl: this.data.guideAvatar || '',
      authLevel: 0,
      isNewUser: true
    };
    this.handleLoginSuccess(loginData);
  },

  // ==================== 页面跳转 ====================

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
