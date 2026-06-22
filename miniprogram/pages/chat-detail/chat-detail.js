/**
 * 聊天详情页
 * 对接后端 ChatController + SignalR 实时推送
 */

const chatApi = require('../../api/chat');
const itemsApi = require('../../api/items');
const signalr = require('../../utils/signalr');
const { formatPrice, formatTime } = require('../../utils/constants');

function formatMsgTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

Page({
  data: {
    sessionId: '',
    targetUserId: '',
    itemId: '',
    targetNickname: '',
    itemInfo: null,
    messages: [],
    inputContent: '',
    canSend: false,
    scrollToView: '',
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

    wx.setNavigationBarTitle({ title: this.data.targetNickname });

    if (itemId) this.loadItemInfo(itemId);
    this.loadMessages();

    // 建立 SignalR 实时连接
    this.connectSignalR();
  },

  onUnload() {
    signalr.offMessage();
  },

  /**
   * 建立 SignalR 实时连接，监听新消息
   */
  connectSignalR() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    signalr.connect(token);
    signalr.onMessage((message) => {
      // 只处理当前会话的消息
      if (message.sessionId === this.data.sessionId && message.senderId !== (wx.getStorageSync('userInfo') || {}).userId) {
        const newMsg = {
          messageId: message.messageId,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
          isMine: false,
          timeText: formatMsgTime(message.timestamp)
        };

        this.setData({
          messages: [...this.data.messages, newMsg]
        });

        this.scrollToBottom();
      }
    });
  },

  async loadItemInfo(itemId) {
    try {
      const item = await itemsApi.getItem(itemId);
      this.setData({
        itemInfo: {
          itemId: item.itemId,
          title: item.title,
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

  async loadMessages() {
    const { sessionId } = this.data;
    if (!sessionId) return;

    this.setData({ loadingMessages: true });
    try {
      const result = await chatApi.getMessages(sessionId);
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = userInfo.userId || '';

      const messages = (result.messages || []).map(m => ({
        messageId: m.messageId,
        senderId: m.senderId,
        content: m.content,
        timestamp: m.timestamp,
        isMine: m.senderId === myUserId,
        timeText: formatMsgTime(m.timestamp)
      }));

      this.setData({ messages, loadingMessages: false });
      this.scrollToBottom();
    } catch (error) {
      console.error('[ChatDetail] loadMessages error:', error);
      this.setData({ loadingMessages: false });
    }
  },

  onInputChange(e) {
    const value = e.detail.value;
    this.setData({ inputContent: value, canSend: value.trim().length > 0 });
  },

  async onSend() {
    const content = this.data.inputContent.trim();
    if (!content || !this.data.targetUserId || !this.data.itemId) return;

    this.setData({ inputContent: '', canSend: false });

    try {
      const result = await chatApi.sendMessage(this.data.targetUserId, this.data.itemId, content);

      const newMsg = {
        messageId: result.messageId,
        senderId: result.senderId,
        content: result.content,
        timestamp: result.timestamp,
        isMine: true,
        timeText: formatMsgTime(result.timestamp)
      };

      this.setData({ messages: [...this.data.messages, newMsg] });
      this.scrollToBottom();
    } catch (error) {
      console.error('[ChatDetail] send error:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
      this.setData({ inputContent: content, canSend: true });
    }
  },

  scrollToBottom() {
    const { messages } = this.data;
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].messageId;
      this.setData({ scrollToView: lastId });
    }
  },

  onTapItem() {
    if (this.data.itemId) {
      wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${this.data.itemId}` });
    }
  }
});
