/**
 * 消息列表页
 * 对接后端 GET /api/v1/chats
 */

const chatApi = require('../../api/chat');
const { formatPrice, formatTime } = require('../../utils/constants');

function formatItemPrice(session) {
  if (session.itemIsRental) return session.itemRentalRate || '租金面议';
  return Number(session.itemPrice) === 0 ? '免费' : `¥${formatPrice(session.itemPrice)}`;
}

function normId(id) {
  return String(id || '').toLowerCase();
}

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
      this.loadSessions().then((sessions) => {
        const existing = this.findSession(sessions || this.data.sessions, sellerId, itemId);
        this.goChatDetail(
          existing ? existing.sessionId : null,
          sellerId,
          itemId,
          sellerNickname || (existing && existing.displayNickname)
        );
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
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = normId(userInfo.userId);

      console.log('[Chat] myUserId:', myUserId);
      console.log('[Chat] sessions:', sessions);

      const processedSessions = (sessions || []).map(session => {
        // 判断角色：如果当前用户是卖家，则对方是买家；否则对方是卖家
        const isSeller = normId(session.sellerId) === myUserId;

        console.log('[Chat] session.sellerId:', session.sellerId, 'isSeller:', isSeller);

        return {
          ...session,
          displayNickname: session.otherUserNickname || '用户',
          displayAvatar: session.otherUserAvatar || '',
          userRole: isSeller ? 1 : 0,
          userRoleText: isSeller ? '卖家' : '买家',
          itemPriceDisplay: formatItemPrice(session)
        };
      });

      this.setData({
        sessions: processedSessions,
        loading: false,
        hasLoaded: true
      });
      return processedSessions;
    } catch (error) {
      console.error('[Chat] loadSessions error:', error);
      this.setData({ loading: false });
      return [];
    }
  },

  findSession(sessions, targetUserId, itemId) {
    const target = normId(targetUserId);
    const item = normId(itemId);
    return (sessions || []).find(session =>
      normId(session.itemId) === item
      && (normId(session.otherUserId) === target || normId(session.targetUserId) === target)
    );
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
