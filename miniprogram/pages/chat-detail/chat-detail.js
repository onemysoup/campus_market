/**
 * 聊天详情页
 * 吸顶商品信息条 + 消息列表 + 输入区域
 */

const chatApi = require('../../api/chat');
const itemsApi = require('../../api/items');
const { formatPrice, formatTime } = require('../../utils/constants');

// Mock 消息数据
function generateMockMessages(count = 10) {
  const messages = [];
  const now = Date.now();
  const contents = [
    '你好，这个还有吗？',
    '有的，还在',
    '价格可以少一点吗？',
    '最低80，不议价了',
    '好的，那我什么时候可以来拿？',
    '明天下午可以吗？',
    '行，到时候联系',
    '收到，谢谢',
    '没问题，随时可以',
    '商品还在吗？',
    '在的，随时可以交易'
  ];

  for (let i = 0; i < count; i++) {
    const isMine = i % 2 === 1;
    messages.push({
      messageId: `msg_${i}_${Date.now()}`,
      senderId: isMine ? 'me' : 'other',
      content: contents[i % contents.length],
      timestamp: now - (count - i) * 300000,  // 每条间隔5分钟
      isMine,
      timeText: formatMsgTime(now - (count - i) * 300000)
    });
  }

  return messages;
}

function formatMsgTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

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
   * 加载消息列表
   */
  async loadMessages() {
    this.setData({ loadingMessages: true });
    try {
      // TODO: 对接真实接口
      // const result = await chatApi.getMessages(this.data.sessionId);

      // Mock: 使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 200));
      const messages = generateMockMessages(10);

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

    // 清空输入框
    this.setData({ inputContent: '', canSend: false });

    // 乐观更新
    const newMsg = {
      messageId: `msg_${Date.now()}`,
      senderId: 'me',
      content,
      timestamp: Date.now(),
      isMine: true,
      timeText: formatMsgTime(Date.now())
    };

    this.setData({
      messages: [...this.data.messages, newMsg]
    });

    this.scrollToBottom();

    // 保存会话到本地存储（供消息列表显示）
    this.saveSessionToList(content);

    // TODO: 对接真实发送接口
    // try {
    //   await chatApi.sendMessage(this.data.sessionId, content);
    // } catch (error) {
    //   wx.showToast({ title: '发送失败', icon: 'none' });
    // }
  },

  /**
   * 保存会话到本地存储
   */
  saveSessionToList(lastMessage) {
    const { sessionId, targetUserId, targetNickname, itemId, itemInfo } = this.data;

    // 生成或复用 sessionId
    const finalSessionId = sessionId || `session_${targetUserId}_${itemId}_${Date.now()}`;

    // 从本地存储获取现有会话列表
    let sessions = wx.getStorageSync('chatSessions') || [];

    // 查找是否已存在该会话
    const existingIndex = sessions.findIndex(s =>
      s.sellerId === targetUserId && s.itemId === itemId
    );

    // 获取当前用户的最新头像昵称
    const userInfo = wx.getStorageSync('userInfo') || {};

    // 构建会话数据（同时存储买卖双方信息）
    const sessionData = {
      sessionId: finalSessionId,
      itemId: itemId,
      itemTitle: itemInfo?.title || '商品',
      itemPrice: itemInfo?.price || '0',
      itemImage: itemInfo?.image || '',
      // 卖家信息（对方）
      sellerId: targetUserId,
      sellerNickname: targetNickname || '卖家',
      sellerAvatar: '',
      // 买家信息（当前用户）
      buyerId: userInfo.userId || '',
      buyerNickname: userInfo.nickname || '',
      buyerAvatar: userInfo.avatarUrl || '',
      // 最后消息
      lastMessage: lastMessage,
      updateTime: new Date().toISOString(),
      updateTimeText: '刚刚',
      unreadCount: 0
    };

    if (existingIndex >= 0) {
      // 更新现有会话
      sessions[existingIndex] = {
        ...sessions[existingIndex],
        lastMessage: lastMessage,
        updateTime: sessionData.updateTime,
        updateTimeText: sessionData.updateTimeText
      };
    } else {
      // 新增会话到列表头部
      sessions.unshift(sessionData);
    }

    // 保存到本地存储
    wx.setStorageSync('chatSessions', sessions);

    // 更新 sessionId
    if (!this.data.sessionId) {
      this.setData({ sessionId: finalSessionId });
    }
  },

  // ==================== 滚动控制 ====================

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
