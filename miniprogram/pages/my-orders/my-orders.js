/**
 * 我的订单页
 * 双 Tab 切换（买入/卖出）、状态筛选
 */

const transactionsApi = require('../../api/transactions');
const {
  ITEM_STATUS_MAP,
  TRANSACTION_TYPE,
  formatPrice,
  formatTime
} = require('../../utils/constants');

/**
 * 交易状态映射
 * 0=Trading(交易中), 1=Completed(已完成), 2=Cancelled(已取消)
 */
const TX_STATUS_MAP = {
  0: { label: '交易中', color: '#f59e0b', bg: '#fef3c7' },
  1: { label: '已完成', color: '#22c55e', bg: '#dcfce7' },
  2: { label: '已取消', color: '#94a3b8', bg: '#f1f5f9' }
};

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
    totalCount: 0,
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
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }

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
   */
  async fetchList(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    const isReset = reset;
    const page = isReset ? 1 : this.data.page + 1;

    this.setData({
      [isReset ? 'loading' : 'loadingMore']: true
    });

    try {
      const { mainTab, pageSize } = this.data;

      const result = await transactionsApi.getTransactions({
        role: mainTab,
        page,
        pageSize
      });

      const items = (result.transactions || []).map(this.formatTransaction);
      const totalCount = result.totalCount || 0;

      // 计算统计
      const stats = this.calculateStats(items, totalCount);

      this.setData({
        list: isReset ? items : [...this.data.list, ...items],
        page,
        totalCount,
        hasMore: (isReset ? items : [...this.data.list, ...items]).length < totalCount,
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
   * 格式化交易数据
   */
  formatTransaction(item) {
    const status = item.status || 0;
    const statusInfo = TX_STATUS_MAP[status] || TX_STATUS_MAP[0];

    return {
      ...item,
      pickupCode: item.secureToken || "",
      priceText: formatPrice(item.price),
      timeText: formatTime(item.createdAt),
      status,
      statusText: statusInfo.label,
      statusColor: statusInfo.color,
      statusBg: statusInfo.bg,
      transactionTypeText: item.transactionType === 1 ? '租赁' : '出售'
    };
  },

  /**
   * 计算统计数据
   */
  calculateStats(items, totalCount) {
    // 简单统计当前列表中的状态分布
    const trading = items.filter(i => i.status === 0).length;
    const completed = items.filter(i => i.status === 1).length;
    const cancelled = items.filter(i => i.status === 2).length;

    return { trading, completed, cancelled };
  },

  // ==================== 操作交互 ====================

  /**
   * 点击订单 → 跳转商品详情
   */
  onTapOrder(e) {
    const { itemid } = e.currentTarget.dataset;
    if (itemid) {
      wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${itemid}` });
    }
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
        try {
          wx.showToast({ title: "请将取货码出示给卖家核销", icon: "none" });
        } catch (error) {
          console.error('[MyOrders] confirmReceive error:', error);
        }
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
        try {
          const securityPassword = await this.promptSecurityPassword('取消交易');
          if (!securityPassword) return;
          await transactionsApi.cancelTransaction(transactionid, '用户主动取消', securityPassword);
          wx.showToast({ title: '已取消', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[MyOrders] cancelTransaction error:', error);
        }
      }
    });
  },

  /**
   * 核销取货码（卖家）
   */
  onVerifyPickup(e) {
    const { transactionid } = e.currentTarget.dataset;
    wx.showModal({
      title: '核销取货码',
      editable: true,
      placeholderText: '请输入买家提供的取货码',
      success: async (res) => {
        if (!res.confirm) return;
        const pickupCode = res.content?.trim();
        if (!pickupCode) {
          wx.showToast({ title: "请将取货码出示给卖家核销", icon: "none" });
          return;
        }

        try {
          const securityPassword = await this.promptSecurityPassword('核销安全验证');
          if (!securityPassword) return;
          await transactionsApi.verifyPickupCode(transactionid, pickupCode, securityPassword);
          wx.showToast({ title: '核销成功', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[MyOrders] verifyPickup error:', error);
        }
      }
    });
  },

  /**
   * 联系对方
   */
  onContact(e) {
    const { otherid, itemid, othername } = e.currentTarget.dataset;
    if (!otherid) {
      wx.showToast({ title: '无法获取对方信息', icon: 'none' });
      return;
    }
    // 聊天页是 Tab 页，必须用 switchTab（不支持带参数），通过 globalData 传递会话参数
    const app = getApp();
    app.globalData.chatParams = {
      sellerId: otherid,
      itemId: itemid,
      sellerNickname: othername || '对方'
    };
    wx.switchTab({ url: '/pages/chat/chat' });
  },

  promptSecurityPassword(title = '安全验证') {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: '请输入安全密码',
        confirmText: '确认',
        confirmColor: '#0f766e',
        success: (res) => {
          if (!res.confirm) {
            resolve('');
            return;
          }
          resolve((res.content || '').trim());
        },
        fail: () => resolve('')
      });
    });
  }
});
