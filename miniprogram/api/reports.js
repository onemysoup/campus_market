/**
 * 举报模块 API
 * 对应后端: ReportsController (/api/v1/reports)
 */

const { post } = require('../utils/request');

const reportsApi = {
  /**
   * 举报用户/商品
   * @param {Object}   data
   * @param {string}     data.targetId        - 被举报者 GUID
   * @param {number}     data.reasonType      - 举报原因枚举值
   * @param {string[]}   data.evidenceImages  - 证据图片 URL 数组
   * @param {string}     data.description     - 举报描述
   */
  reportUser(data) {
    return post('/api/v1/reports', data);
  }
};

module.exports = reportsApi;
