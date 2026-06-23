/**
 * 聊天详情页
 * 对接后端：
 * - GET /api/v1/chats/{sessionId}/messages
 * - POST /api/v1/chats/send
 */

const chatApi = require('../../api/chat');
const itemsApi = require('../../api/items');
const { formatPrice, formatTime } = require('../../utils/constants');

Page({
  data: {
    // 会话信息
    sessionId: '',
    targetUserId: '',
    itemId: '',
    targetNickname: '',
    // 商品信息（吸顶显示）
    itemInfo: null,
    // 消息列表
    messages: [],
    // 输入框
    inputContent: '',
    canSend: false,
    // 滚动位置
    scrollToView: '',
    // 加载状态
    loadingMessages: false
  },

  onLoad(options) {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }

    const { sessionId, targetUserId, itemId, targetNickname } = options;

    this.setData({
      sessionId: sessionId || '',
      targetUserId: targetUserId || '',
      itemId: itemId || '',
      targetNickname: targetNickname ? decodeURIComponent(targetNickname) : '用户'
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: this.data.targetNickname
    });

    // 加载商品信息
    if (itemId) {
      this.loadItemInfo(itemId);
    }

    // 加载消息
    this.loadMessages();
  },

  // ==================== 数据加载 ====================

  /**
   * 加载商品信息（吸顶显示）
   */
  async loadItemInfo(itemId) {
    try {
      const item = await itemsApi.getItem(itemId);
      this.setData({
        itemInfo: {
          itemId: item.itemId,
          title: item.title,
          price: formatPrice(item.price),
          priceText: formatPrice(item.price),
          image: item.images?.[0] || '',
          status: item.status,
          statusText: item.status === 1 ? '在售' : item.status === 3 ? '已售出' : '已下架'
        }
      });
    } catch (error) {
      console.error('[ChatDetail] loadItemInfo error:', error);
    }
  },

  /**
   * 加载消息列表（对接后端）
   */
  async loadMessages() {
    const { sessionId } = this.data;
    if (!sessionId) return;

    this.setData({ loadingMessages: true });

    try {
      const result = await chatApi.getMessages(sessionId, { page: 1, pageSize: 50 });

      // 处理消息数据
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = userInfo.userId || '';

      const messages = (result?.messages || result || []).map(msg => ({
        ...msg,
        isMine: msg.senderId === myUserId,
        timeText: this.formatMsgTime(msg.timestamp)
      }));

      this.setData({
        messages,
        loadingMessages: false
      });

      // 滚动到底部
      this.scrollToBottom();
    } catch (error) {
      console.error('[ChatDetail] loadMessages error:', error);
      this.setData({ loadingMessages: false });
    }
  },

  // ==================== 消息发送 ====================

  onInputChange(e) {
    const value = e.detail.value;
    this.setData({
      inputContent: value,
      canSend: value.trim().length > 0
    });
  },

  async onSend() {
    const content = this.data.inputContent.trim();
    if (!content) return;

    const { targetUserId, itemId, sessionId } = this.data;

    // 清空输入框
    this.setData({ inputContent: '', canSend: false });

    // 乐观更新
    const userInfo = wx.getStorageSync('userInfo') || {};
    const newMsg = {
      messageId: `msg_${Date.now()}`,
      senderId: userInfo.userId,
      content,
      timestamp: Date.now(),
      isMine: true,
      timeText: this.formatMsgTime(Date.now())
    };

    this.setData({
      messages: [...this.data.messages, newMsg]
    });

    this.scrollToBottom();

    // 调用后端接口发送消息
    try {
      await chatApi.sendMessage({
        receiverId: targetUserId,
        itemId: itemId,
        content: content,
        msgType: 0  // 文本消息
      });
    } catch (error) {
      console.error('[ChatDetail] sendMessage error:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // ==================== 工具函数 ====================

  formatMsgTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  scrollToBottom() {
    const { messages } = this.data;
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].messageId;
      this.setData({ scrollToView: lastId });
    }
  },

  // ==================== 商品信息栏点击 ====================

  onTapItem() {
    if (this.data.itemId) {
      wx.navigateTo({
        url: `/pages/goods-detail/goods-detail?id=${this.data.itemId}`
      });
    }
  }
});
