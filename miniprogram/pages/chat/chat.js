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

      // 处理会话数据，适配后端返回格式
      const processedSessions = (sessions || []).map(session => ({
        ...session,
        // 显示对方的头像昵称（后端返回的是 otherUserId/otherUserNickname）
        displayNickname: session.otherUserNickname || '用户',
        displayAvatar: session.otherUserAvatar || '',
        // 角色标签（根据是否有卖家信息判断）
        userRole: 0,
        userRoleText: '卖家'
      }));

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
      session.otherUserId || session.targetUserId,
      session.itemId,
      session.displayNickname || session.otherUserNickname
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
