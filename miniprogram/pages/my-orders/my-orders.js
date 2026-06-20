/**
 * 我的订单页
 * 双 Tab 切换（买入/卖出）、状态筛选、Mock 数据层
 *
 * TODO: 待后端提供 GET /api/v1/transactions 列表接口后对接
 */

const {
  ITEM_STATUS_MAP,
  TRANSACTION_TYPE,
  formatPrice,
  formatTime
} = require('../../utils/constants');

// ==================== Mock 数据生成 ====================

/**
 * 交易状态枚举（对齐后端 TransactionVO 设计）
 * 0=Trading(交易中), 1=Completed(已完成), 2=Cancelled(已取消)
 */
const TX_STATUS = {
  TRADING: 0,
  COMPLETED: 1,
  CANCELLED: 2
};

const TX_STATUS_MAP = {
  0: { label: '交易中', color: '#f59e0b', bg: '#fef3c7' },
  1: { label: '已完成', color: '#22c55e', bg: '#dcfce7' },
  2: { label: '已取消', color: '#94a3b8', bg: '#f1f5f9' }
};

/**
 * Mock 商品标题池
 */
const MOCK_TITLES = [
  '高等数学第七版（同济大学）',
  'MacBook Pro 2021 M1 Pro',
  'AirPods Pro 2 代',
  '考研英语真题集',
  '小米台灯 Pro',
  '宿舍小冰箱 9成新',
  '篮球 斯伯丁正品',
  '优衣库羽绒服 L码',
  '线性代数教材+习题册',
  'iPad Air 5 256G'
];

/**
 * Mock 图片
 */
const MOCK_IMAGES = [
  'https://via.placeholder.com/200x200/e2e8f0/64748b?text=Item1',
  'https://via.placeholder.com/200x200/d1fae5/059669?text=Item2',
  'https://via.placeholder.com/200x200/fee2e2/dc2626?text=Item3',
  'https://via.placeholder.com/200x200/e0f2fe/0284c7?text=Item4',
  'https://via.placeholder.com/200x200/fef3c7/d97706?text=Item5'
];

/**
 * 生成 Mock 交易数据
 * @param {string} role - 'buyer' | 'seller'
 * @param {number} status - TX_STATUS 枚举值
 * @param {number} count - 生成数量
 */
function generateMockTransactions(role, status, count = 3) {
  const items = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const titleIdx = Math.floor(Math.random() * MOCK_TITLES.length);
    const imgIdx = Math.floor(Math.random() * MOCK_IMAGES.length);
    const price = (Math.random() * 200 + 10).toFixed(2);
    const daysAgo = Math.floor(Math.random() * 30);

    items.push({
      // 交易核心字段（对齐后端 TransactionVO）
      transactionId: `tx_mock_${role}_${status}_${i}_${Date.now()}`,
      itemId: `item_mock_${i}`,
      buyerId: role === 'buyer' ? 'current_user_id' : `user_b_${i}`,
      sellerId: role === 'seller' ? 'current_user_id' : `user_s_${i}`,
      transactionType: Math.random() > 0.7 ? TRANSACTION_TYPE.RENTAL : TRANSACTION_TYPE.SALE,
      tokenStatus: status === TX_STATUS.COMPLETED ? 1 : 0,
      rentalStatus: 0,
      agreedLocation: '东区食堂门口',
      isCrossCampus: false,
      tokenExpiredAt: new Date(now + 86400000).toISOString(),
      createdAt: new Date(now - daysAgo * 86400000).toISOString(),

      // 商品信息（对齐 ItemCardVO）
      title: MOCK_TITLES[titleIdx],
      price: Number(price),
      priceText: price,
      imageUrl: MOCK_IMAGES[imgIdx],
      firstImage: MOCK_IMAGES[imgIdx],

      // 交易状态
      status,
      statusText: TX_STATUS_MAP[status].label,
      statusColor: TX_STATUS_MAP[status].color,
      statusBg: TX_STATUS_MAP[status].bg,

      // 展示用时间
      timeText: formatTime(new Date(now - daysAgo * 86400000).toISOString()),

      // 对方用户信息
      otherNickname: role === 'buyer' ? `卖家${i + 1}` : `买家${i + 1}`,
      otherAvatar: ''
    });
  }

  return items;
}

Page({
  data: {
    // 主 Tab：买入/卖出
    mainTab: 'buyer',
    mainTabs: [
      { key: 'buyer', label: '我买到的' },
      { key: 'seller', label: '我卖出的' }
    ],
    // 状态筛选 Tab
    statusTab: -1,  // -1=全部
    statusTabs: [
      { key: -1, label: '全部' },
      { key: 0, label: '交易中' },
      { key: 1, label: '已完成' },
      { key: 2, label: '已取消' }
    ],
    // 列表数据
    list: [],
    // 分页
    page: 1,
    pageSize: 10,
    hasMore: true,
    // 加载状态
    loading: false,
    loadingMore: false,
    // 统计
    stats: {
      trading: 0,
      completed: 0,
      cancelled: 0
    }
  },

  onLoad(options) {
    // 支持从外部传入初始 Tab
    if (options.tab === 'sell') {
      this.setData({ mainTab: 'seller' });
    }
    this.fetchList(true);
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.loadingMore) {
      this.fetchList(false);
    }
  },

  // ==================== Tab 切换 ====================

  onMainTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.mainTab) return;
    this.setData({ mainTab: tab });
    this.fetchList(true);
  },

  onStatusTabChange(e) {
    const status = Number(e.currentTarget.dataset.status);
    if (status === this.data.statusTab) return;
    this.setData({ statusTab: status });
    this.fetchList(true);
  },

  // ==================== 数据加载 ====================

  /**
   * 获取交易列表
   * TODO: 替换为真实接口
   */
  async fetchList(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    const isReset = reset;
    const page = isReset ? 1 : this.data.page + 1;

    this.setData({
      [isReset ? 'loading' : 'loadingMore']: true
    });

    try {
      // TODO: 待后端提供交易列表接口后对接
      // const result = await transactionsApi.getList({
      //   role: this.data.mainTab,
      //   status: this.data.statusTab === -1 ? undefined : this.data.statusTab,
      //   page,
      //   pageSize: this.data.pageSize
      // });

      // Mock: 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      const { mainTab, statusTab, pageSize } = this.data;
      const mockData = this.generateMockPage(mainTab, statusTab, page, pageSize);

      // 更新统计
      const stats = this.calculateStats(mainTab);

      this.setData({
        list: isReset ? mockData.list : [...this.data.list, ...mockData.list],
        page,
        hasMore: mockData.hasMore,
        stats,
        loading: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('[MyOrders] fetchList error:', error);
      this.setData({
        loading: false,
        loadingMore: false
      });
    }
  },

  /**
   * 生成分页 Mock 数据
   */
  generateMockPage(role, status, page, pageSize) {
    // 总共模拟 25 条数据
    const totalMock = 25;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalMock);

    if (start >= totalMock) {
      return { list: [], hasMore: false };
    }

    let items = [];
    const remaining = end - start;

    if (status === -1) {
      // 全部：混合不同状态
      const perStatus = Math.ceil(remaining / 3);
      items = [
        ...generateMockTransactions(role, TX_STATUS.TRADING, perStatus),
        ...generateMockTransactions(role, TX_STATUS.COMPLETED, perStatus),
        ...generateMockTransactions(role, TX_STATUS.CANCELLED, perStatus)
      ].slice(0, remaining);
    } else {
      items = generateMockTransactions(role, status, remaining);
    }

    return {
      list: items,
      hasMore: end < totalMock
    };
  },

  /**
   * 计算各状态统计
   */
  calculateStats(role) {
    // Mock 统计数据
    return {
      trading: 5,
      completed: 12,
      cancelled: 3
    };
  },

  // ==================== 操作交互 ====================

  /**
   * 点击订单 → 跳转详情
   */
  onTapOrder(e) {
    const { transactionid, itemid } = e.currentTarget.dataset;
    // TODO: 跳转交易详情页
    wx.showToast({ title: '交易详情页开发中', icon: 'none' });
  },

  /**
   * 确认收货（买家）
   */
  async onConfirmReceive(e) {
    const { transactionid } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认收货',
      content: '请确认已收到商品，确认后将完成交易',
      success: async (res) => {
        if (!res.confirm) return;
        // TODO: 对接 POST /api/v1/transactions/{id}/verify
        wx.showToast({ title: '确认成功', icon: 'success' });
        this.fetchList(true);
      }
    });
  },

  /**
   * 取消交易
   */
  async onCancelTransaction(e) {
    const { transactionid } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消交易',
      content: '确定要取消这笔交易吗？',
      success: async (res) => {
        if (!res.confirm) return;
        // TODO: 对接 POST /api/v1/transactions/{id}/cancel
        wx.showToast({ title: '已取消', icon: 'none' });
        this.fetchList(true);
      }
    });
  },

  /**
   * 联系对方
   */
  onContact(e) {
    const { otherid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${otherid}`
    });
  }
});
