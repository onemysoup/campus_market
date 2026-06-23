/**
 * 管理后台页
 * 仪表盘 + 用户管理 + 商品管理 + 举报处理
 */

const adminApi = require('../../api/admin');
const itemsApi = require('../../api/items');
const {
  REPORT_REASON_MAP,
  ITEM_STATUS_MAP,
  CATEGORY_LIST,
  formatPrice,
  formatTime
} = require('../../utils/constants');

Page({
  data: {
    // 权限
    isAdmin: false,
    // 仪表盘数据
    dashboard: {
      totalUsers: 0,
      totalItems: 0,
      activeItems: 0,
      pendingReports: 0,
      todayNewUsers: 0,
      todayNewItems: 0,
      todayTransactions: 0
    },
    // Tab 切换
    activeTab: 'dashboard',
    tabs: [
      { key: 'dashboard', label: '仪表盘', icon: '📊' },
      { key: 'users', label: '用户管理', icon: '👥' },
      { key: 'items', label: '商品管理', icon: '📦' },
      { key: 'reports', label: '举报处理', icon: '🚨' }
    ],
    // 用户列表
    users: [],
    userPage: 1,
    userHasMore: true,
    // 商品列表
    items: [],
    itemPage: 1,
    itemHasMore: true,
    // 举报列表
    reports: [],
    reportPage: 1,
    reportHasMore: true,
    // 加载状态
    loading: false,
    loadingUsers: false,
    loadingItems: false,
    loadingReports: false,
    // 操作弹窗
    showActionModal: false,
    actionType: '',
    actionData: {},
    actionLoading: false,
    // 信用分调整表单
    creditForm: {
      userId: '',
      delta: '',
      reason: ''
    }
  },

  onLoad(options) {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }

    const userInfo = app.globalData.userInfo;
    const isAdmin = userInfo && userInfo.roleType === 'Admin';

    if (!isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '此页面仅限管理员访问',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }

    // 支持从 URL 参数指定初始 Tab
    const initialTab = options.tab || 'dashboard';
    this.setData({ isAdmin: true, activeTab: initialTab });

    // 加载对应 Tab 的数据
    if (initialTab === 'dashboard') {
      this.loadDashboard();
    } else if (initialTab === 'users') {
      this.loadUsers(true);
    } else if (initialTab === 'items') {
      this.loadItems(true);
    } else if (initialTab === 'reports') {
      this.loadReports(true);
    }
  },

  onPullDownRefresh() {
    const { activeTab } = this.data;
    if (activeTab === 'dashboard') {
      this.loadDashboard().finally(() => wx.stopPullDownRefresh());
    } else if (activeTab === 'users') {
      this.loadUsers(true).finally(() => wx.stopPullDownRefresh());
    } else if (activeTab === 'items') {
      this.loadItems(true).finally(() => wx.stopPullDownRefresh());
    } else if (activeTab === 'reports') {
      this.loadReports(true).finally(() => wx.stopPullDownRefresh());
    }
  },

  // ==================== Tab 切换 ====================

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });

    if (tab === 'dashboard') {
      this.loadDashboard();
    } else if (tab === 'users') {
      this.loadUsers(true);
    } else if (tab === 'items') {
      this.loadItems(true);
    } else if (tab === 'reports') {
      this.loadReports(true);
    }
  },

  // ==================== 仪表盘 ====================

  async loadDashboard() {
    this.setData({ loading: true });
    try {
      const dashboard = await adminApi.getDashboard();
      this.setData({
        dashboard: dashboard || {},
        loading: false
      });
    } catch (error) {
      console.error('[Admin] loadDashboard error:', error);
      this.setData({ loading: false });
    }
  },

  // ==================== 用户管理 ====================

  async loadUsers(reset = false) {
    if (this.data.loadingUsers) return;

    const page = reset ? 1 : this.data.userPage + 1;
    this.setData({ loadingUsers: true });

    try {
      const result = await adminApi.getUsers({ page, pageSize: 20 });
      const users = (result.users || []).map(u => ({
        ...u,
        timeText: formatTime(u.createdAt)
      }));

      this.setData({
        users: reset ? users : [...this.data.users, ...users],
        userPage: page,
        userHasMore: users.length >= 20,
        loadingUsers: false
      });
    } catch (error) {
      console.error('[Admin] loadUsers error:', error);
      this.setData({ loadingUsers: false });
    }
  },

  onToggleBan(e) {
    const { userid, nickname, banned } = e.currentTarget.dataset;
    const isBanned = banned === 'true';

    wx.showModal({
      title: isBanned ? '解封用户' : '封禁用户',
      content: `确定要${isBanned ? '解封' : '封禁'}用户「${nickname}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await adminApi.toggleBan(userid, !isBanned);
          wx.showToast({ title: isBanned ? '已解封' : '已封禁', icon: 'success' });
          this.loadUsers(true);
        } catch (error) {
          console.error('[Admin] toggleBan error:', error);
        }
      }
    });
  },

  onAdjustCredit(e) {
    const { userid, nickname } = e.currentTarget.dataset;
    this.setData({
      showActionModal: true,
      actionType: 'adjustCredit',
      actionData: { userId: userid, nickname },
      creditForm: { userId: userid, delta: '', reason: '' }
    });
  },

  // ==================== 商品管理 ====================

  async loadItems(reset = false) {
    if (this.data.loadingItems) return;

    const page = reset ? 1 : this.data.itemPage + 1;
    this.setData({ loadingItems: true });

    try {
      // 使用真实接口获取商品列表
      const result = await itemsApi.getItems({ page, pageSize: 20 });
      const items = (result.items || []).map(item => ({
        ...item,
        priceText: formatPrice(item.price),
        categoryText: CATEGORY_LIST.find(c => c.id === item.category)?.name || '',
        statusText: ITEM_STATUS_MAP[item.status]?.label || '',
        statusColor: ITEM_STATUS_MAP[item.status]?.color || ''
      }));

      this.setData({
        items: reset ? items : [...this.data.items, ...items],
        itemPage: page,
        itemHasMore: items.length >= 20,
        loadingItems: false
      });
    } catch (error) {
      console.error('[Admin] loadItems error:', error);
      this.setData({ loadingItems: false });
    }
  },

  onTakeOffline(e) {
    const { itemid, title } = e.currentTarget.dataset;

    wx.showModal({
      title: '下架商品',
      content: `确定要下架「${title}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await itemsApi.changeStatus(itemid, 4);  // 4=Inactive
          wx.showToast({ title: '已下架', icon: 'success' });
          this.loadItems(true);
        } catch (error) {
          console.error('[Admin] takeOffline error:', error);
        }
      }
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` });
  },

  // ==================== 举报处理 ====================

  async loadReports(reset = false) {
    if (this.data.loadingReports) return;

    const page = reset ? 1 : this.data.reportPage + 1;
    this.setData({ loadingReports: true });

    try {
      const result = await adminApi.getReports({ page, pageSize: 20 });
      const reports = (result.reports || []).map(r => ({
        ...r,
        reasonText: REPORT_REASON_MAP[r.reason]?.label || '未知',
        timeText: formatTime(r.createdAt)
      }));

      this.setData({
        reports: reset ? reports : [...this.data.reports, ...reports],
        reportPage: page,
        reportHasMore: reports.length >= 20,
        loadingReports: false
      });
    } catch (error) {
      console.error('[Admin] loadReports error:', error);
      this.setData({ loadingReports: false });
    }
  },

  onHandleReport(e) {
    const { reportid, accept } = e.currentTarget.dataset;

    wx.showModal({
      title: accept === 'true' ? '接受举报' : '驳回举报',
      content: accept === 'true' ? '确定接受此举报？将对被举报者进行处理。' : '确定驳回此举报？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await adminApi.handleReport(reportid, accept === 'true', '');
          wx.showToast({ title: '处理成功', icon: 'success' });
          this.loadReports(true);
          this.loadDashboard();
        } catch (error) {
          console.error('[Admin] handleReport error:', error);
        }
      }
    });
  },

  // ==================== 弹窗操作 ====================

  onCloseModal() {
    this.setData({ showActionModal: false });
  },

  onStopPropagation() {},

  onCreditDeltaInput(e) {
    this.setData({ 'creditForm.delta': e.detail.value });
  },

  onCreditReasonInput(e) {
    this.setData({ 'creditForm.reason': e.detail.value });
  },

  async onSubmitCredit() {
    const { creditForm } = this.data;
    const delta = Number(creditForm.delta);

    if (!delta || delta === 0) {
      wx.showToast({ title: '请输入调整分值', icon: 'none' });
      return;
    }

    if (!creditForm.reason.trim()) {
      wx.showToast({ title: '请输入调整原因', icon: 'none' });
      return;
    }

    this.setData({ actionLoading: true });
    try {
      await adminApi.adjustCredit(creditForm.userId, delta, creditForm.reason.trim());
      wx.showToast({ title: '调整成功', icon: 'success' });
      this.setData({ showActionModal: false });
      this.loadUsers(true);
    } catch (error) {
      console.error('[Admin] adjustCredit error:', error);
    } finally {
      this.setData({ actionLoading: false });
    }
  }
});
