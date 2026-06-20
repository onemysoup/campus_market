/**
 * 交易模块 API
 * 对应后端: TransactionsController (/api/v1/transactions)
 */

const { get, post } = require('../utils/request');

const transactionsApi = {
  /**
   * 创建交易（购买/预定）
   * @param {Object}  data
   * @param {string}    data.itemId         - 商品 GUID
   * @param {string}    data.agreedLocation - 约定交易地点
   * @param {boolean}   data.isCrossCampus  - 是否跨校区
   */
  createTransaction(data) {
    return post('/api/v1/transactions', data);
  },

  /**
   * 核销取货码（卖家确认）
   * @param {string} id         - 交易 GUID
   * @param {string} pickupCode - 取货码
   */
  verifyPickupCode(id, pickupCode) {
    return post(`/api/v1/transactions/${id}/verify`, { pickupCode });
  },

  /**
   * 取消交易
   * @param {string} id     - 交易 GUID
   * @param {string} reason - 取消原因
   */
  cancelTransaction(id, reason) {
    return post(`/api/v1/transactions/${id}/cancel`, { reason });
  },

  /**
   * 开始租赁
   * @param {string} id               - 交易 GUID
   * @param {string} expectedReturnTime - 预计归还时间（ISO 格式）
   */
  startRental(id, expectedReturnTime) {
    return post(`/api/v1/transactions/${id}/rent-start`, { expectedReturnTime });
  },

  /**
   * 完成归还
   * @param {string} id - 交易 GUID
   */
  completeReturn(id) {
    return post(`/api/v1/transactions/${id}/rent-return`);
  },

  /**
   * 获取交易列表
   * @param {Object} params
   * @param {string} params.role - 角色：buyer/seller
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getTransactions(params = {}) {
    return get('/api/v1/transactions', params);
  }
};

module.exports = transactionsApi;
