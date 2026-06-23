/**
 * 管理后台模块 API
 * 对应后端: AdminController (/api/v1/admin)
 */

const { get, patch, post } = require('../utils/request');

const adminApi = {
  /**
   * 获取用户列表
   * @param {Object} params
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getUsers(params = {}) {
    return get('/api/v1/admin/users', params);
  },

  /**
   * 获取仪表盘统计数据
   */
  getDashboard() {
    return get('/api/v1/admin/stats/dashboard');
  },

  /**
   * 获取举报统计
   */
  getReportStats() {
    return get('/api/v1/admin/stats/reports');
  },

  /**
   * 获取待处理举报列表
   * @param {Object} params
   * @param {number} params.page     - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getReports(params = {}) {
    return get('/api/v1/admin/reports', params);
  },

  /**
   * 处理举报
   * @param {string}  id     - 举报 GUID
   * @param {boolean} accept - 是否接受举报
   * @param {string}  note   - 处理备注
   */
  handleReport(id, accept, note) {
    return patch(`/api/v1/admin/reports/${id}`, { accept, note });
  },

  /**
   * 获取 L2 高级认证申请
   * @param {Object} params
   * @param {number} params.status - 0=待审核, 1=已通过, 2=已驳回
   */
  getVerifications(params = {}) {
    return get('/api/v1/admin/verifications', params);
  },

  /**
   * 审核 L2 高级认证申请
   * @param {string} id - 申请 GUID
   * @param {boolean} approve - true=通过, false=驳回
   * @param {string} note - 管理员备注
   */
  handleVerification(id, approve, note = '') {
    return patch(`/api/v1/admin/verifications/${id}`, { approve, note });
  },

  /**
   * 封禁/解封用户
   * @param {string}  id  - 用户 GUID
   * @param {boolean} ban - true=封禁, false=解封
   */
  toggleBan(id, ban) {
    return patch(`/api/v1/admin/users/${id}/ban`, { ban });
  },

  /**
   * 调整用户信用分
   * @param {string} id     - 用户 GUID
   * @param {number} delta  - 变动值（正数加分，负数扣分）
   * @param {string} reason - 原因
   */
  adjustCredit(id, delta, reason) {
    return post(`/api/v1/admin/users/${id}/credit`, { delta, reason });
  }
};

module.exports = adminApi;
