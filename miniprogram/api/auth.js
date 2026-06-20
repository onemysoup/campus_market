/**
 * 认证模块 API
 * 对应后端: AuthController (/api/v1/auth)
 */

const { post, put } = require('../utils/request');

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
   * 设置安全密码（首次）
   * @param {string} password - 密码
   */
  setPassword(password) {
    return post('/api/v1/auth/set-password', { password });
  },

  /**
   * 重置密码
   * @param {string} email      - 邮箱
   * @param {string} code       - 验证码
   * @param {string} newPassword - 新密码
   */
  resetPassword(email, code, newPassword) {
    return post('/api/v1/auth/reset-password', { email, code, newPassword });
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
