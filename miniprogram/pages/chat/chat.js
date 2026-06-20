/**
 * 消息列表页
 * 按闲鱼电商会话模型：基于 [买家+卖家+商品] 三元组的会话列表
 */

const chatApi = require('../../api/chat');
const { formatTime } = require('../../utils/constants');

// ==================== Mock 数据生成 ====================

let mockCounter = 0;  // 全局计数器，确保 sessionId 唯一

/**
 * ChatCardVO 数据结构
 */
function generateMockSessions(count = 10) {
  const items = [
    { itemId: 'item1', title: '高等数学第七版', price: 45, image: '' },
    { itemId: 'item2', title: 'MacBook Pro 2021', price: 8999, image: '' },
    { itemId: 'item3', title: 'AirPods Pro 2', price: 1299, image: '' },
    { itemId: 'item4', title: '考研英语真题', price: 35, image: '' },
    { itemId: 'item5', title: '小米台灯 Pro', price: 128, image: '' },
    { itemId: 'item6', title: '宿舍小冰箱', price: 299, image: '' },
    { itemId: 'item7', title: '篮球 斯伯丁', price: 89, image: '' },
    { itemId: 'item8', title: '优衣库羽绒服', price: 199, image: '' }
  ];

  const users = [
    { userId: 'user1', nickname: '张同学', avatar: '' },
    { userId: 'user2', nickname: '李学姐', avatar: '' },
    { userId: 'user3', nickname: '王学长', avatar: '' },
    { userId: 'user4', nickname: '赵同学', avatar: '' },
    { userId: 'user5', nickname: '刘学姐', avatar: '' }
  ];

  const messages = [
    '你好，这个还有吗？',
    '有的，还在',
    '价格可以少一点吗？',
    '最低80，不议价了',
    '好的，那我什么时候可以来拿？',
    '明天下午可以吗？',
    '行，到时候联系',
    '收到，谢谢',
    '没问题',
    '商品还在吗？',
    '在的，随时可以交易',
    '好的，我考虑一下'
  ];

  const sessions = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    mockCounter++;  // 递增计数器
    const item = items[i % items.length];
    const user = users[i % users.length];
    const isBuyer = i % 2 === 0;  // 交替买家/卖家角色
    const minutesAgo = Math.floor(Math.random() * 1440);  // 0-24小时前
    const unread = Math.floor(Math.random() * 5);  // 0-4条未读

    sessions.push({
      // 会话核心标识（三元组 + 唯一计数器）
      sessionId: `session_${user.userId}_${item.itemId}_${mockCounter}_${Date.now()}`,
      itemId: item.itemId,
      itemTitle: item.title,
      itemPrice: item.price,
      itemImage: item.image,

      // 卖家信息
      sellerId: user.userId,
      sellerNickname: user.nickname,
      sellerAvatar: user.avatar,

      // 买家信息（模拟）
      buyerId: 'current_user',
      buyerNickname: '我',
      buyerAvatar: '',

      // 最后消息
      lastMessage: messages[i % messages.length],
      updateTime: new Date(now - minutesAgo * 60000).toISOString(),
      updateTimeText: formatUpdateTime(now - minutesAgo * 60000),

      // 状态
      unreadCount: unread
    });
  }

  // 按 updateTime 倒序排列
  sessions.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));

  return sessions;
}

/**
 * 格式化更新时间为可读格式
 */
function formatUpdateTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  // 1分钟内
  if (minutes < 1) return '刚刚';
  // 1小时内
  if (minutes < 60) return `${minutes}分钟前`;
  // 24小时内
  if (hours < 24) return `${hours}小时前`;
  // 超过24小时
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

Page({
  data: {
    // 会话列表
    sessions: [],
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    // 加载状态
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
    // 检查是否从其他页面跳转过来
    const app = getApp();
    if (app.globalData.chatParams) {
      const { sellerId, itemId, sellerNickname } = app.globalData.chatParams;
      app.globalData.chatParams = null;

      // 先刷新列表（包含刚预创建的会话）
      this.loadSessions(true);

      // 然后跳转到聊天详情
      setTimeout(() => {
        this.goChatDetail(null, sellerId, itemId, sellerNickname);
      }, 100);
      return;
    }

    // 每次显示时刷新（从详情页返回时能看到最新消息）
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

  // ==================== 数据加载 ====================

  /**
   * 加载会话列表
   */
  async loadSessions(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    const isReset = reset;

    this.setData({
      [isReset ? 'loading' : 'loadingMore']: true
    });

    try {
      // TODO: 对接真实接口
      // const result = await chatApi.getSessions({ page, pageSize: this.data.pageSize });

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200));

      // 从本地存储获取真实会话
      let localSessions = wx.getStorageSync('chatSessions') || [];

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      const myUserId = userInfo.userId || '';

      // 处理会话数据，根据当前用户显示对方信息
      localSessions = localSessions.map(session => {
        // 判断当前用户是买家还是卖家
        const isSeller = session.sellerId === myUserId;

        return {
          ...session,
          // 显示对方的头像昵称
          displayNickname: isSeller ? (session.buyerNickname || '买家') : (session.sellerNickname || '卖家'),
          displayAvatar: isSeller ? (session.buyerAvatar || '') : (session.sellerAvatar || ''),
          // 角色标签：显示对方的角色
          userRole: isSeller ? 1 : 0,  // 1=我是卖家(对方是买家), 0=我是买家(对方是卖家)
          userRoleText: isSeller ? '买家' : '卖家'
        };
      });

      // 如果本地没有会话，显示一些 Mock 数据（仅用于演示）
      let sessions = localSessions;
      if (sessions.length === 0 && isReset) {
        const mockSessions = generateMockSessions(5);
        // Mock 数据中我是买家，显示卖家信息
        sessions = mockSessions.map(s => ({
          ...s,
          displayNickname: s.sellerNickname,
          displayAvatar: s.sellerAvatar,
          userRole: 0,
          userRoleText: '卖家'
        }));
      }

      this.setData({
        sessions: isReset ? sessions : [...this.data.sessions, ...sessions],
        page: 1,
        hasMore: false,
        loading: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('[Chat] loadSessions error:', error);
      this.setData({
        loading: false,
        loadingMore: false
      });
    }
  },

  // ==================== 交互操作 ====================

  /**
   * 点击会话卡片 → 跳转聊天详情
   */
  onTapSession(e) {
    const session = e.currentTarget.dataset.session;
    this.goChatDetail(
      session.sessionId,
      session.targetUserId,
      session.itemId,
      session.targetNickname
    );
  },

  /**
   * 从详情页返回时刷新
   */
  onReachTop() {
    // 到达顶部时不做额外操作
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
   * 滑动删除会话
   */
  onSlideDelete(e) {
    const { session } = e.currentTarget.dataset;
    const index = e.detail.index;

    if (index === 0) {
      // 删除操作
      wx.showModal({
        title: '删除会话',
        content: `确定删除与「${session.targetNickname}」的会话吗？`,
        success: (res) => {
          if (!res.confirm) return;

          // 从列表中移除
          const sessions = this.data.sessions.filter(
            s => s.sessionId !== session.sessionId
          );
          this.setData({ sessions });

          // 更新本地存储
          wx.setStorageSync('chatSessions', sessions);

          wx.showToast({ title: '已删除', icon: 'success' });
        }
      });
    }
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

        // 清空本地存储
        wx.removeStorageSync('chatSessions');

        this.setData({
          sessions: [],
          page: 1,
          hasMore: false
        });

        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  }
});
