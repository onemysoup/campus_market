/**
 * 用户资料模块 API
 * 对应后端: ProfileController (/api/v1/users/me)
 * 所有操作默认基于当前登录用户，无需传入 userId
 */

const { get, post, del } = require('../utils/request');

const profileApi = {
  /**
   * 获取当前用户信用分
   */
  getCredit() {
    return get('/api/v1/users/me/credit');
  },

  /**
   * 获取信用分变动记录
   * @param {Object} params
   * @param {number} params.page     - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getCreditLog(params = {}) {
    return get('/api/v1/users/me/credit/log', params);
  },

  /**
   * 获取浏览记录
   */
  getHistory() {
    return get('/api/v1/users/me/history');
  },

  /**
   * 清空浏览记录
   */
  clearHistory() {
    return del('/api/v1/users/me/history');
  },

  /**
   * 获取黑名单列表
   */
  getBlacklist() {
    return get('/api/v1/users/me/blacklist');
  },

  /**
   * 拉黑用户
   * @param {string} blockedId - 要拉黑的用户 GUID
   */
  addBlacklist(blockedId) {
    return post('/api/v1/users/me/blacklist', { blockedId });
  },

  /**
   * 取消拉黑
   * @param {string} blockedId - 要取消拉黑的用户 GUID
   */
  removeBlacklist(blockedId) {
    return del(`/api/v1/users/me/blacklist/${blockedId}`);
  }
};

module.exports = profileApi;
