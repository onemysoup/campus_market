/**
 * 求购模块 API
 * 对应后端: RequestsController (/api/v1/requests)
 */

const { get, post, del } = require('../utils/request');

const requestsApi = {
  /**
   * 获取求购帖列表
   * @param {Object} params
   * @param {number} params.page     - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getRequests(params = {}) {
    return get('/api/v1/requests', params);
  },

  /**
   * 发布求购帖
   * @param {Object} data
   * @param {string}  data.title        - 标题
   * @param {number}  data.maxPrice     - 最高预算
   * @param {boolean} data.isUrgent     - 是否急求
   * @param {number}  data.resourceType - 资源类型枚举值
   * @param {number}  data.campusArea   - 校区枚举值
   */
  createRequest(data) {
    return post('/api/v1/requests', data);
  },

  /**
   * 响应求购（"我有它"：用自己的一件在售商品响应）
   * @param {string} id      - 求购帖 GUID
   * @param {string} itemId  - 用于响应的商品 GUID
   * @param {string} message - 可选补充说明
   */
  respondRequest(id, itemId, message = '') {
    return post(`/api/v1/requests/${id}/respond`, { itemId, message });
  },

  /**
   * 查看某条求购帖收到的响应商品列表（发布者用）
   * @param {string} id - 求购帖 GUID
   */
  getResponses(id) {
    return get(`/api/v1/requests/${id}/responses`);
  },

  /**
   * 续期求购帖
   * @param {string} id - 求购帖 GUID
   */
  renewRequest(id) {
    return post(`/api/v1/requests/${id}/renew`);
  },

  /**
   * 关闭/删除求购帖
   * @param {string} id - 求购帖 GUID
   */
  closeRequest(id) {
    return del(`/api/v1/requests/${id}`);
  }
};

module.exports = requestsApi;
