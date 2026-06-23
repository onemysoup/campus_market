/**
 * 消息列表页
 * 对接后端 GET /api/v1/chats
 */

const chatApi = require('../../api/chat');
const { formatTime } = require('../../utils/constants');

Page({
  data: {
    sessions: [],
    loading: false,
    hasLoaded: false
  },

  onLoad() {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
  },

  onShow() {
    // 检查是否从其他页面跳转过来
    const app = getApp();
    if (app.globalData.chatParams) {
      const { sellerId, itemId, sellerNickname } = app.globalData.chatParams;
      app.globalData.chatParams = null;

      // 先加载会话列表
      this.loadSessions().then(() => {
        // 跳转到聊天详情
        this.goChatDetail(null, sellerId, itemId, sellerNickname);
      });
      return;
    }

    // 每次显示时刷新
    this.loadSessions();
  },

  onPullDownRefresh() {
    this.loadSessions().finally(() => wx.stopPullDownRefresh());
  },

  /**
   * 加载会话列表（对接后端）
   */
  async loadSessions() {
    this.setData({ loading: true });

    try {
      const sessions = await chatApi.getSessions();

      // 处理会话数据，根据当前用户显示对方信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = userInfo.userId || '';

      const processedSessions = (sessions || []).map(session => {
        // 判断当前用户是买家还是卖家
        const isSeller = session.sellerId === myUserId;

        return {
          ...session,
          // 显示对方的头像昵称
          displayNickname: isSeller ? (session.buyerNickname || '买家') : (session.sellerNickname || '卖家'),
          displayAvatar: isSeller ? (session.buyerAvatar || '') : (session.sellerAvatar || ''),
          // 角色标签
          userRole: isSeller ? 1 : 0,
          userRoleText: isSeller ? '买家' : '卖家'
        };
      });

      this.setData({
        sessions: processedSessions,
        loading: false,
        hasLoaded: true
      });
    } catch (error) {
      console.error('[Chat] loadSessions error:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 点击会话卡片 → 跳转聊天详情
   */
  onTapSession(e) {
    const session = e.currentTarget.dataset.session;
    this.goChatDetail(
      session.sessionId,
      session.targetUserId || (session.userRole === 1 ? session.buyerId : session.sellerId),
      session.itemId,
      session.displayNickname
    );
  },

  /**
   * 跳转聊天详情页
   */
  goChatDetail(sessionId, targetUserId, itemId, targetNickname) {
    const params = [];
    if (sessionId) params.push(`sessionId=${sessionId}`);
    if (targetUserId) params.push(`targetUserId=${targetUserId}`);
    if (itemId) params.push(`itemId=${itemId}`);
    if (targetNickname) params.push(`targetNickname=${encodeURIComponent(targetNickname)}`);

    wx.navigateTo({
      url: `/pages/chat-detail/chat-detail?${params.join('&')}`
    });
  },

  /**
   * 清空全部消息
   */
  onClearAll() {
    wx.showModal({
      title: '清空消息',
      content: '确定清空所有会话吗？此操作不可恢复。',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return;

        this.setData({ sessions: [] });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  }
});
