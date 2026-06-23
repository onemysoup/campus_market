/**
 * 认证模块 API
 * 对应后端: AuthController (/api/v1/auth)
 */

const { get, post, put } = require('../utils/request');

const authApi = {
  /**
   * 微信登录
   * @param {string} code - wx.login() 获取的 code
   */
  wxLogin(code) {
    return post('/api/v1/auth/wx-login', { code });
  },

  /**
   * 邮箱密码登录
   * @param {string} email - 邮箱地址
   * @param {string} password - 密码
   */
  emailLogin(email, password) {
    return post('/api/v1/auth/login', { email, password });
  },

  /**
   * 发送邮箱验证码
   * @param {string} email - CAU 邮箱地址
   */
  sendCode(email) {
    return post('/api/v1/auth/send-code', { email });
  },

  /**
   * 验证邮箱
   * @param {string} email - 邮箱地址
   * @param {string} code  - 验证码
   */
  verifyEmail(email, code) {
    return post('/api/v1/auth/verify-email', { email, code });
  },

  /**
   * 设置邮箱登录密码（首次）
   * @param {string} password - 密码
   */
  setPassword(password) {
    return post('/api/v1/auth/set-password', { password });
  },

  /**
   * 设置安全密码/交易确认密码（首次）
   * @param {string} password - 6位数字安全密码
   */
  setSecurityPassword(password) {
    return post('/api/v1/auth/set-security-password', { password });
  },

  /**
   * 查询 L2 高级认证申请状态
   */
  getStudentVerification() {
    return get('/api/v1/auth/student-verification');
  },

  /**
   * 提交 L2 高级认证申请
   * @param {Object} data
   * @param {string} data.realName - 姓名
   * @param {string} data.studentId - 学号
   * @param {string} data.certificateImageUrl - 学生证/证件照片 URL
   */
  submitStudentVerification(data) {
    return post('/api/v1/auth/student-verification', data);
  },

  /**
   * 重置登录密码
   * @param {string} email      - 邮箱
   * @param {string} code       - 验证码
   * @param {string} newPassword - 新密码
   */
  resetPassword(email, code, newPassword) {
    return post('/api/v1/auth/reset-password', { email, code, newPassword });
  },

  /**
   * 重置安全密码
   * @param {string} email       - 当前账号绑定邮箱
   * @param {string} code        - 验证码
   * @param {string} newPassword - 6位数字安全密码
   */
  resetSecurityPassword(email, code, newPassword) {
    return post('/api/v1/auth/reset-security-password', { email, code, newPassword });
  },

  /**
   * 设置校区
   * @param {number} campusArea - 校区枚举值 (0=东, 1=西, 2=两校区)
   */
  setCampus(campusArea) {
    return put('/api/v1/auth/campus', { campusArea });
  },

  /**
   * 更新用户资料（昵称、头像）
   * @param {Object} data
   * @param {string} data.nickname - 昵称
   * @param {string} data.avatarUrl - 头像 URL
   */
  updateProfile(data) {
    return put('/api/v1/auth/profile', data);
  }
};

module.exports = authApi;
