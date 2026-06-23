/**
 * 聊天模块 API
 * 对应后端: ChatController (/api/v1/chats)
 */

const { get, post } = require('../utils/request');

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
  },

  /**
   * 发送消息
   * @param {Object} data
   * @param {string} data.receiverId - 接收方用户 GUID
   * @param {string} data.itemId     - 关联商品 GUID
   * @param {string} data.content    - 消息内容
   * @param {number} data.msgType    - 消息类型 (0=文本, 1=图片)
   */
  sendMessage(data) {
    return post('/api/v1/chats/send', data);
  }
};

module.exports = chatApi;
