/**
 * 聊天详情页
 * 对接后端：
 * - GET /api/v1/chats/{sessionId}/messages
 * - POST /api/v1/chats/send
 */

const chatApi = require('../../api/chat');
const itemsApi = require('../../api/items');
const filesApi = require('../../api/files');
const profileApi = require('../../api/profile');
const signalr = require('../../utils/signalr');
const { formatPrice, formatTime } = require('../../utils/constants');

Page({
  data: {
    // 会话信息
    sessionId: '',
    targetUserId: '',
    itemId: '',
    targetNickname: '',
    // 当前登录用户 ID（用于判断消息归属，统一来源避免气泡左右错位）
    myUserId: '',
    // 商品信息（吸顶显示）
    itemInfo: null,
    // 消息列表
    messages: [],
    // 输入框
    inputContent: '',
    canSend: false,
    // 跨区提醒
    showCrossTip: false,
    // 校园场景快捷短语（F4.1.1）
    quickPhrases: [
      '同学你好，东西还在吗？',
      '东校区哪里见面方便？',
      '可以稍微便宜点吗？',
      '我下课了，现在可以面交。'
    ],
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
    console.log('[ChatDetail] onLoad options:', options);

    this.setData({
      sessionId: sessionId || '',
      targetUserId: targetUserId || '',
      itemId: itemId || '',
      targetNickname: targetNickname ? decodeURIComponent(targetNickname) : '用户',
      myUserId: this.normId(app.getUserId())
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

    // 建立 SignalR 实时连接，监听新消息
    this.connectSignalR();
  },

  onUnload() {
    signalr.offMessage();
  },

  // ==================== SignalR ====================

  // 规范化 ID 比较（GUID 大小写/类型不一致兜底，避免气泡左右错位）
  normId(id) {
    return String(id || '').toLowerCase();
  },

  connectSignalR() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    signalr.connect(token);
    signalr.onMessage((message) => {
      // 只处理当前会话的消息，且不是自己发的
      if (message.sessionId && message.sessionId === this.data.sessionId &&
          this.normId(message.senderId) !== this.data.myUserId) {
        const newMsg = {
          messageId: message.messageId,
          senderId: message.senderId,
          content: message.content,
          msgType: message.msgType,
          timestamp: message.timestamp,
          isMine: false,
          timeText: this.formatMsgTime(message.timestamp)
        };

        this.setData({
          messages: [...this.data.messages, newMsg]
        });

        this.scrollToBottom();
      }
    });
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
        },
        showCrossTip: item.supportCrossCampus === true
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

      // 处理消息数据（统一用 myUserId 规范化比较，修正首条消息归属错位）
      const myUserId = this.data.myUserId || this.normId(getApp().getUserId());

      const messages = (result?.messages || result || []).map(msg => ({
        ...msg,
        isMine: this.normId(msg.senderId) === myUserId,
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

  // 点击快捷短语：填入输入框，由用户确认后发送
  onQuickPhrase(e) {
    const text = e.currentTarget.dataset.text || '';
    this.setData({ inputContent: text, canSend: text.trim().length > 0 });
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
      console.log('[ChatDetail] 发送消息:', { receiverId: targetUserId, itemId, content });
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

  // ==================== 图片消息 ====================

  // 选择并发送图片消息
  onChooseImage() {
    const { targetUserId, itemId } = this.data;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFile = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '发送中...', mask: true });
        try {
          const uploaded = await filesApi.uploadImage(tempFile);
          const imageUrl = uploaded.url;

          // 乐观更新
          const newMsg = {
            messageId: `msg_${Date.now()}`,
            senderId: this.data.myUserId,
            content: imageUrl,
            msgType: 1,
            timestamp: Date.now(),
            isMine: true,
            timeText: this.formatMsgTime(Date.now())
          };
          this.setData({ messages: [...this.data.messages, newMsg] });
          this.scrollToBottom();

          await chatApi.sendMessage({
            receiverId: targetUserId,
            itemId: itemId,
            content: imageUrl,
            msgType: 1
          });
        } catch (error) {
          console.error('[ChatDetail] sendImage error:', error);
          wx.showToast({ title: '图片发送失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // 预览图片消息
  onPreviewMessageImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    const urls = this.data.messages
      .filter(m => m.msgType === 1)
      .map(m => m.content);
    wx.previewImage({ current: src, urls });
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
  },

  // 拉黑当前聊天对象（SRS F5.3.1 个人黑名单）
  onBlockUser() {
    const { targetUserId, targetNickname } = this.data;
    if (!targetUserId) return;
    wx.showModal({
      title: '拉黑用户',
      content: `拉黑后「${targetNickname}」将无法查看你的商品，也无法给你发消息。确定拉黑吗？`,
      confirmText: '拉黑',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await profileApi.addBlacklist(targetUserId);
          wx.showToast({ title: '已拉黑', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (error) {
          console.error('[ChatDetail] block error:', error);
        }
      }
    });
  }
});
