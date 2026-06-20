/**
 * API 模块统一出口
 * 按业务线拆分，便于维护和 tree-shaking
 *
 * 使用方式：
 *   const { authApi, itemsApi } = require('../../api');
 *   // 或单独引入
 *   const authApi = require('../../api/auth');
 */

const authApi = require('./auth');
const itemsApi = require('./items');
const transactionsApi = require('./transactions');
const chatApi = require('./chat');
const requestsApi = require('./requests');
const profileApi = require('./profile');
const reportsApi = require('./reports');
const adminApi = require('./admin');

module.exports = {
  authApi,
  itemsApi,
  transactionsApi,
  chatApi,
  requestsApi,
  profileApi,
  reportsApi,
  adminApi
};
