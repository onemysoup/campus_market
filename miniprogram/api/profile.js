/**
 * 用户资料模块 API
 * 对应后端: ProfileController (/api/v1/users/{userId})
 */

const { get, post, del } = require('../utils/request');

const profileApi = {
  /**
   * 获取用户信用分
   * @param {string} userId - 用户 GUID
   */
  getCredit(userId) {
    return get(`/api/v1/users/${userId}/credit`);
  },

  /**
   * 获取信用分变动记录
   * @param {string} userId - 用户 GUID
   * @param {Object} params
   * @param {number} params.page     - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getCreditLog(userId, params = {}) {
    return get(`/api/v1/users/${userId}/credit/log`, params);
  },

  /**
   * 获取浏览记录
   * @param {string} userId - 用户 GUID
   */
  getHistory(userId) {
    return get(`/api/v1/users/${userId}/history`);
  },

  /**
   * 清空浏览记录
   * @param {string} userId - 用户 GUID
   */
  clearHistory(userId) {
    return del(`/api/v1/users/${userId}/history`);
  },

  /**
   * 获取黑名单列表
   * @param {string} userId - 用户 GUID
   */
  getBlacklist(userId) {
    return get(`/api/v1/users/${userId}/blacklist`);
  },

  /**
   * 拉黑用户
   * @param {string} userId    - 当前用户 GUID
   * @param {string} blockedId - 要拉黑的用户 GUID
   */
  addBlacklist(userId, blockedId) {
    return post(`/api/v1/users/${userId}/blacklist`, { blockedId });
  },

  /**
   * 取消拉黑
   * @param {string} userId    - 当前用户 GUID
   * @param {string} blockedId - 要取消拉黑的用户 GUID
   */
  removeBlacklist(userId, blockedId) {
    return del(`/api/v1/users/${userId}/blacklist/${blockedId}`);
  }
};

module.exports = profileApi;
