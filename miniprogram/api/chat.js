/**
 * 聊天模块 API
 * 对应后端: ChatController (/api/v1/chats)
 */

const { get } = require('../utils/request');

const chatApi = {
  /**
   * 获取会话列表
   */
  getSessions() {
    return get('/api/v1/chats');
  },

  /**
   * 获取会话消息历史
   * @param {string} sessionId - 会话 GUID
   * @param {Object} params
   * @param {number} params.page     - 页码
   * @param {number} params.pageSize - 每页数量
   */
  getMessages(sessionId, params = {}) {
    return get(`/api/v1/chats/${sessionId}/messages`, params);
  }
};

module.exports = chatApi;
