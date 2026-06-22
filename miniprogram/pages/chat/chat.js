/**
 * 消息列表页
 * 对接后端 ChatController (/api/v1/chats)
 */

const chatApi = require('../../api/chat');
const { formatTime } = require('../../utils/constants');

Page({
  data: {
    sessions: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    loadingMore: false,
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
    const app = getApp();
    if (app.globalData.chatParams) {
      const { sellerId, itemId, sellerNickname } = app.globalData.chatParams;
      app.globalData.chatParams = null;

      this.loadSessions(true);

      setTimeout(() => {
        this.goChatDetail(null, sellerId, itemId, sellerNickname);
      }, 100);
      return;
    }

    this.loadSessions(true);
  },

  onPullDownRefresh() {
    this.loadSessions(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.loadingMore) {
      this.loadSessions(false);
    }
  },

  /**
   * 加载会话列表
   */
  async loadSessions(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    const isReset = reset;
    const page = isReset ? 1 : this.data.page;

    this.setData({
      [isReset ? 'loading' : 'loadingMore']: true
    });

    try {
      const result = await chatApi.getSessions();
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = userInfo.userId || '';

      // 将后端返回的 ChatSessionVO 映射为前端展示格式
      const sessions = (result || []).map(s => ({
        sessionId: s.sessionId,
        itemId: s.itemId,
        itemTitle: s.itemTitle || '',
        itemPrice: formatPrice(s.itemPrice),
        itemImage: s.itemImage || '',

        // 对方信息
        targetUserId: s.otherUserId,
        targetNickname: s.otherUserNickname || '未知用户',
        targetAvatar: s.otherUserAvatar || '',

        // 卖家/买家信息（根据当前用户判断）
        sellerId: myUserId === s.otherUserId ? s.otherUserId : myUserId,
        sellerNickname: myUserId === s.otherUserId ? s.otherUserNickname : userInfo.nickname || '我',
        sellerAvatar: myUserId === s.otherUserId ? s.otherUserAvatar : userInfo.avatarUrl || '',
        buyerId: myUserId !== s.otherUserId ? s.otherUserId : myUserId,
        buyerNickname: myUserId !== s.otherUserId ? s.otherUserNickname : userInfo.nickname || '我',
        buyerAvatar: myUserId !== s.otherUserId ? s.otherUserAvatar : userInfo.avatarUrl || '',

        // 最后消息
        lastMessage: s.lastMessagePreview || '',
        updateTime: s.lastMessageTime || s.createdAt,
        updateTimeText: formatTime(s.lastMessageTime || s.createdAt),
        unreadCount: 0,

        // 显示信息
        displayNickname: s.otherUserNickname || '未知用户',
        displayAvatar: s.otherUserAvatar || '',
        userRole: 0,
        userRoleText: '卖家'
      }));

      this.setData({
        sessions: isReset ? sessions : [...this.data.sessions, ...sessions],
        page: page + 1,
        hasMore: false,
        loading: false,
        loadingMore: false,
        hasLoaded: true
      });
    } catch (error) {
      console.error('[Chat] loadSessions error:', error);
      this.setData({
        loading: false,
        loadingMore: false,
        hasLoaded: true
      });
    }
  },

  onTapSession(e) {
    const session = e.currentTarget.dataset.session;
    this.goChatDetail(
      session.sessionId,
      session.targetUserId,
      session.itemId,
      session.targetNickname
    );
  },

  onReachTop() {},

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

  onSlideDelete(e) {
    const { session } = e.currentTarget.dataset;
    const index = e.detail.index;

    if (index === 0) {
      wx.showModal({
        title: '删除会话',
        content: `确定删除与「${session.targetNickname}」的会话吗？`,
        success: (res) => {
          if (!res.confirm) return;

          const sessions = this.data.sessions.filter(
            s => s.sessionId !== session.sessionId
          );
          this.setData({ sessions });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      });
    }
  },

  onClearAll() {
    wx.showModal({
      title: '清空消息',
      content: '确定清空所有会话吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ sessions: [], page: 1, hasMore: false });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  }
});
