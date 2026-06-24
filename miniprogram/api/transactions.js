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
  verifyPickupCode(id, pickupCode, securityPassword) {
    return post(`/api/v1/transactions/${id}/verify`, { pickupCode, securityPassword });
  },

  /**
   * 取消交易
   * @param {string} id     - 交易 GUID
   * @param {string} reason - 取消原因
   */
  cancelTransaction(id, reason, securityPassword) {
    return post(`/api/v1/transactions/${id}/cancel`, { reason, securityPassword });
  },

  /**
   * 开始租赁
   * @param {string} id               - 交易 GUID
   * @param {string} expectedReturnTime - 预计归还时间（ISO 格式）
   */
  startRental(id, expectedReturnTime, securityPassword) {
    return post(`/api/v1/transactions/${id}/rent-start`, { expectedReturnTime, securityPassword });
  },

  /**
   * 完成归还
   * @param {string} id - 交易 GUID
   */
  completeReturn(id, securityPassword) {
    return post(`/api/v1/transactions/${id}/rent-return`, { securityPassword });
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
  },

  /**
   * 提交交易评价（交易完成后，1-5 星 + 文字）
   * @param {string} id      - 交易 GUID
   * @param {number} rating  - 星级 1-5
   * @param {string} comment - 评价文字（选填）
   */
  submitReview(id, rating, comment = '') {
    return post(`/api/v1/transactions/${id}/review`, { rating, comment });
  },

  /**
   * 查看某用户收到的评价与平均分（用于卖家信誉展示）
   * @param {string} userId - 被评价用户 GUID
   */
  getUserReviews(userId) {
    return get(`/api/v1/transactions/reviews/${userId}`);
  }
};

module.exports = transactionsApi;
