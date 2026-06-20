/**
 * 聊天页
 * 会话列表 + 对话详情 + 消息收发
 *
 * TODO: 待后端实现 SignalR 实时消息推送
 */

const chatApi = require('../../api/chat');
const { formatTime } = require('../../utils/constants');

// Mock 消息数据
const MOCK_MESSAGES = [
  { messageId: 'm1', senderId: 'other', content: '你好，这个还有吗？', timestamp: Date.now() - 3600000, isRead: true },
  { messageId: 'm2', senderId: 'me', content: '有的，还在', timestamp: Date.now() - 3500000, isRead: true },
  { messageId: 'm3', senderId: 'other', content: '价格可以少一点吗？', timestamp: Date.now() - 3400000, isRead: true },
  { messageId: 'm4', senderId: 'me', content: '最低80，不议价了', timestamp: Date.now() - 3300000, isRead: true },
  { messageId: 'm5', senderId: 'other', content: '好的，那我什么时候可以来拿？', timestamp: Date.now() - 3200000, isRead: false }
];

Page({
  data: {
    // 页面模式：list=会话列表, chat=对话详情
    mode: 'list',
    // 当前用户 ID
    myUserId: '',
    // 会话列表
    sessions: [],
    // 当前会话信息
    currentSession: null,
    sessionId: '',
    // 消息列表
    messages: [],
    // 输入框
    inputContent: '',
    inputFocus: false,
    // 键盘高度
    keyboardHeight: 0,
    // 滚动位置
    scrollToView: '',
    scrollToBottom: '',
    // 加载状态
    loadingSessions: false,
    loadingMessages: false
  },

  onLoad(options) {
    // 检查登录
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }

    const userId = app.getUserId();
    this.setData({ myUserId: userId });

    // 判断进入模式
    if (options.sessionId) {
      // 直接进入对话
      this.setData({
        mode: 'chat',
        sessionId: options.sessionId
      });
      this.loadMessages(options.sessionId);
    } else if (options.sellerId && options.itemId) {
      // 从商品详情页发起聊天
      this.startNewChat(options.sellerId, options.itemId);
    } else {
      // 显示会话列表
      this.loadSessions();
    }

    // 监听键盘高度变化
    wx.onKeyboardHeightChange(this.onKeyboardHeightChange.bind(this));
  },

  onUnload() {
    wx.offKeyboardHeightChange();
  },

  // ==================== 会话列表 ====================

  /**
   * 加载会话列表
   */
  async loadSessions() {
    this.setData({ loadingSessions: true });
    try {
      const sessions = await chatApi.getSessions();
      this.setData({
        sessions: sessions || [],
        loadingSessions: false
      });
    } catch (error) {
      console.error('[Chat] loadSessions error:', error);
      this.setData({ loadingSessions: false });
    }
  },

  /**
   * 点击会话 → 进入对话
   */
  onTapSession(e) {
    const session = e.currentTarget.dataset.session;
    this.setData({
      mode: 'chat',
      sessionId: session.sessionId,
      currentSession: session
    });
    this.loadMessages(session.sessionId);
  },

  /**
   * 返回会话列表
   */
  onBackToList() {
    this.setData({
      mode: 'list',
      sessionId: '',
      currentSession: null,
      messages: []
    });
    this.loadSessions();
  },

  // ==================== 对话详情 ====================

  /**
   * 发起新聊天
   */
  startNewChat(sellerId, itemId) {
    // Mock: 创建临时会话
    this.setData({
      mode: 'chat',
      sessionId: `temp_${sellerId}_${itemId}`,
      currentSession: {
        sessionId: `temp_${sellerId}_${itemId}`,
        otherUserId: sellerId,
        otherUserNickname: '卖家',
        itemId: itemId
      }
    });
    this.loadMessages(`temp_${sellerId}_${itemId}`);
  },

  /**
   * 加载消息历史
   */
  async loadMessages(sessionId) {
    this.setData({ loadingMessages: true });
    try {
      // TODO: 对接真实接口
      // const result = await chatApi.getMessages(sessionId);
      // this.setData({ messages: result.messages || [] });

      // Mock: 使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 200));

      const messages = MOCK_MESSAGES.map(msg => ({
        ...msg,
        isMine: msg.senderId === 'me',
        timeText: this.formatMsgTime(msg.timestamp)
      }));

      this.setData({
        messages,
        loadingMessages: false
      });

      // 滚动到底部
      this.scrollToBottom();
    } catch (error) {
      console.error('[Chat] loadMessages error:', error);
      this.setData({ loadingMessages: false });
    }
  },

  // ==================== 消息发送 ====================

  onInputChange(e) {
    this.setData({ inputContent: e.detail.value });
  },

  onInputFocus() {
    this.setData({ inputFocus: true });
    setTimeout(() => this.scrollToBottom(), 100);
  },

  onInputBlur() {
    this.setData({ inputFocus: false });
  },

  /**
   * 发送消息
   */
  async onSend() {
    const content = this.data.inputContent.trim();
    if (!content) return;

    // 清空输入框
    this.setData({ inputContent: '' });

    // 乐观更新：立即显示消息
    const newMsg = {
      messageId: `msg_${Date.now()}`,
      senderId: 'me',
      content,
      timestamp: Date.now(),
      isRead: false,
      isMine: true,
      timeText: '刚刚'
    };

    this.setData({
      messages: [...this.data.messages, newMsg]
    });

    // 滚动到底部
    this.scrollToBottom();

    // TODO: 对接真实发送接口
    // try {
    //   await chatApi.sendMessage(this.data.sessionId, content);
    // } catch (error) {
    //   wx.showToast({ title: '发送失败', icon: 'none' });
    // }

    // Mock: 模拟对方回复
    setTimeout(() => {
      const reply = {
        messageId: `msg_reply_${Date.now()}`,
        senderId: 'other',
        content: this.getMockReply(),
        timestamp: Date.now(),
        isRead: false,
        isMine: false,
        timeText: '刚刚'
      };
      this.setData({
        messages: [...this.data.messages, reply]
      });
      this.scrollToBottom();
    }, 1000 + Math.random() * 2000);
  },

  /**
   * 获取 Mock 回复
   */
  getMockReply() {
    const replies = [
      '好的，没问题',
      '可以的',
      '行，那我们约个时间',
      '还有什么问题吗？',
      '好的，到时候联系',
      '收到，谢谢',
      '没问题，随时可以'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  },

  // ==================== 键盘与滚动 ====================

  /**
   * 键盘高度变化
   */
  onKeyboardHeightChange(res) {
    const keyboardHeight = res.height || 0;
    this.setData({ keyboardHeight });
    if (keyboardHeight > 0) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    const { messages } = this.data;
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].messageId;
      this.setData({
        scrollToView: lastId,
        scrollToBottom: `msg_bottom_${Date.now()}`
      });
    }
  },

  // ==================== 工具函数 ====================

  /**
   * 格式化消息时间
   */
  formatMsgTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 今天内
    if (diff < 86400000 && date.getDate() === now.getDate()) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 更早
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
});
