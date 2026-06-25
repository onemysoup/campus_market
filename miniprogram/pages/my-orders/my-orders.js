/**
 * 我的订单页
 * 双 Tab 切换（买入/卖出）、状态筛选
 */

const transactionsApi = require('../../api/transactions');
const securityPrefs = require('../../utils/security');
const {
  ITEM_STATUS_MAP,
  TRANSACTION_TYPE,
  RENTAL_STATUS,
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

function formatPriceDisplay(item) {
  const isRental = item.isRental || item.transactionType === TRANSACTION_TYPE.RENTAL;
  if (isRental) return item.rentalRate || '租金面议';
  return Number(item.price) === 0 ? '免费' : `¥${formatPrice(item.price)}`;
}

function getRentalStatusInfo(status) {
  const map = {
    [RENTAL_STATUS.NOT_APPLICABLE]: { label: '待借出', color: '#f59e0b', bg: '#fef3c7' },
    [RENTAL_STATUS.RENTING]: { label: '租赁中', color: '#0f766e', bg: '#ccfbf1' },
    [RENTAL_STATUS.OVERDUE]: { label: '已逾期', color: '#dc2626', bg: '#fee2e2' },
    [RENTAL_STATUS.RETURNED]: { label: '已归还', color: '#22c55e', bg: '#dcfce7' }
  };
  return map[status] || map[RENTAL_STATUS.NOT_APPLICABLE];
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
    },
    // 取货凭证卡片（F4.2.2 离线凭证/代领）
    showVoucher: false,
    voucher: null
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

      const params = {
        role: mainTab,
        page,
        pageSize
      };
      if (this.data.statusTab >= 0) {
        params.status = this.data.statusTab;
      }

      const result = await transactionsApi.getTransactions(params);

      const items = (result.transactions || []).map(item => this.formatTransaction(item));
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
    const isRental = item.isRental || item.transactionType === TRANSACTION_TYPE.RENTAL;
    const rentalStatus = Number(item.rentalStatus || RENTAL_STATUS.NOT_APPLICABLE);
    const rentalStatusInfo = getRentalStatusInfo(rentalStatus);
    const displayStatusInfo = isRental && status === 0 ? rentalStatusInfo : statusInfo;

    return {
      ...item,
      title: item.title || item.itemTitle || '商品',
      firstImage: item.firstImage || '',
      isRental,
      rentalStatus,
      rentalStatusText: rentalStatusInfo.label,
      rentalReturnCode: item.rentalReturnCode || '',
      pickupCode: isRental && rentalStatus !== RENTAL_STATUS.NOT_APPLICABLE ? '' : (item.secureToken || ""),
      priceText: formatPrice(item.price),
      priceDisplay: formatPriceDisplay(item),
      timeText: formatTime(item.createdAt),
      status,
      statusText: displayStatusInfo.label,
      statusColor: displayStatusInfo.color,
      statusBg: displayStatusInfo.bg,
      transactionTypeText: item.transactionType === 1 ? '租赁' : '出售',
      otherNickname: this.data.mainTab === 'buyer'
        ? (item.sellerNickname || '卖家')
        : (item.buyerNickname || '买家')
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
          const securityPassword = await securityPrefs.maybePromptSecurityPassword('cancelOrder', '取消交易');
          if (securityPassword === null) return;
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
        const pickupCode = (res.content || '').trim();
        if (!pickupCode) {
          wx.showToast({ title: "请将取货码出示给卖家核销", icon: "none" });
          return;
        }

        try {
          const securityPassword = await securityPrefs.maybePromptSecurityPassword('verifyPickup', '核销安全验证');
          if (securityPassword === null) return;
          await transactionsApi.verifyPickupCode(transactionid, pickupCode, securityPassword);
          wx.showToast({ title: '核销成功', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[MyOrders] verifyPickup error:', error);
        }
      }
    });
  },

  promptInput(title, placeholderText, content = '') {
    return new Promise(resolve => {
      wx.showModal({
        title,
        content,
        editable: true,
        placeholderText,
        success: (res) => {
          if (!res.confirm) {
            resolve(null);
            return;
          }
          resolve((res.content || '').trim());
        },
        fail: () => resolve(null)
      });
    });
  },

  buildExpectedReturnTime(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  },

  /**
   * 租赁借出核销（卖家）
   */
  async onStartRental(e) {
    const { transactionid } = e.currentTarget.dataset;
    const daysText = await this.promptInput(
      '设置租期',
      '请输入租期天数，如 7'
    );
    if (daysText === null) return;

    const days = daysText === '' ? 7 : Number(daysText);
    if (!Number.isInteger(days) || days <= 0 || days > 365) {
      wx.showToast({ title: '租期需为1-365天', icon: 'none' });
      return;
    }

    const pickupCode = await this.promptInput('借出核销', '请输入买家提供的借出核销码');
    if (pickupCode === null) return;
    if (!pickupCode) {
      wx.showToast({ title: '请填写借出核销码', icon: 'none' });
      return;
    }

    try {
      const securityPassword = await securityPrefs.maybePromptSecurityPassword('verifyPickup', '借出安全验证');
      if (securityPassword === null) return;
      const result = await transactionsApi.startRental(
        transactionid,
        this.buildExpectedReturnTime(days),
        pickupCode,
        securityPassword
      );
      const returnCode = result && result.returnCode ? result.returnCode : '';
      wx.showModal({
        title: '租赁已开始',
        content: returnCode
          ? `归还确认码：${returnCode}\n归还时请出示给买家。`
          : '租赁已开始，归还时请在订单中查看归还确认码。',
        showCancel: false
      });
      this.fetchList(true);
    } catch (error) {
      console.error('[MyOrders] startRental error:', error);
    }
  },

  /**
   * 租赁归还核销（买家）
   */
  async onCompleteRentalReturn(e) {
    const { transactionid } = e.currentTarget.dataset;
    const returnCode = await this.promptInput('归还核销', '请输入卖家提供的归还确认码');
    if (returnCode === null) return;
    if (!returnCode) {
      wx.showToast({ title: '请填写归还确认码', icon: 'none' });
      return;
    }

    try {
      const securityPassword = await securityPrefs.maybePromptSecurityPassword('verifyPickup', '归还安全验证');
      if (securityPassword === null) return;
      await transactionsApi.completeReturn(transactionid, returnCode, securityPassword);
      wx.showToast({ title: '归还成功', icon: 'success' });
      this.fetchList(true);
    } catch (error) {
      console.error('[MyOrders] completeRentalReturn error:', error);
    }
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

  /**
   * 展示取货凭证卡片（可截图发给代领人）
   */
  onShowVoucher(e) {
    const { code, title, location, image } = e.currentTarget.dataset;
    this.setData({
      showVoucher: true,
      voucher: {
        code: code || '',
        title: title || '',
        location: location || '约定交易地点',
        image: image || ''
      }
    });
  },

  onCloseVoucher() {
    this.setData({ showVoucher: false });
  },

  // 阻止凭证卡片内部点击冒泡到遮罩导致关闭
  stopPropagation() {},

  /**
   * 评价交易（完成后，先选星级再写文字）
   */
  onReview(e) {
    const { transactionid } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['⭐⭐⭐⭐⭐ 非常满意', '⭐⭐⭐⭐ 满意', '⭐⭐⭐ 一般', '⭐⭐ 不满意', '⭐ 很差'],
      success: (r) => {
        const rating = 5 - r.tapIndex;
        wx.showModal({
          title: `评价（${rating} 星）`,
          editable: true,
          placeholderText: '说说这次交易体验（选填）',
          success: async (m) => {
            if (!m.confirm) return;
            try {
              await transactionsApi.submitReview(transactionid, rating, (m.content || '').trim());
              wx.showToast({ title: '评价成功', icon: 'success' });
              this.fetchList(true);
            } catch (error) {
              console.error('[MyOrders] review error:', error);
            }
          }
        });
      }
    });
  },

  promptSecurityPassword() {
    return Promise.resolve('');
  }
});
