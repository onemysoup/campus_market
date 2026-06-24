/**
 * 管理后台页
 * 仪表盘 + 用户管理 + 商品管理 + 认证审核 + 举报处理
 */

const adminApi = require('../../api/admin');
const itemsApi = require('../../api/items');
const { getBaseURL } = require('../../utils/request');
const {
  REPORT_REASON_MAP,
  ITEM_STATUS_MAP,
  CATEGORY_LIST,
  CAMPUS_AREA_MAP,
  formatPrice,
  formatTime
} = require('../../utils/constants');

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function defaultStatsFilter() {
  return {
    period: 'week',
    campusIndex: 0,
    startDate: dateOffset(-6),
    endDate: dateOffset(0)
  };
}

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
      pendingVerifications: 0,
      todayNewUsers: 0,
      todayNewItems: 0,
      todayTransactions: 0
    },
    analytics: {
      summary: {},
      daily: [],
      campus: [],
      categories: [],
      topItems: []
    },
    statsFilter: defaultStatsFilter(),
    statsPeriods: [
      { key: 'day', label: '日' },
      { key: 'week', label: '周' },
      { key: 'month', label: '月' },
      { key: 'custom', label: '自定义' }
    ],
    statsCampusOptions: ['全部校区', '东校区', '西校区'],
    // Tab 切换
    activeTab: 'dashboard',
    tabs: [
      { key: 'dashboard', label: '仪表盘', icon: '📊' },
      { key: 'users', label: '用户管理', icon: '👥' },
      { key: 'items', label: '商品管理', icon: '📦' },
      { key: 'verifications', label: '认证审核', icon: '✅' },
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
    // 认证申请列表
    verifications: [],
    verificationPage: 1,
    verificationHasMore: true,
    // 举报列表
    reports: [],
    reportPage: 1,
    reportHasMore: true,
    // 加载状态
    loading: false,
    loadingUsers: false,
    loadingItems: false,
    loadingVerifications: false,
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

    const initialTab = options.tab || 'dashboard';
    this.setData({ isAdmin: true, activeTab: initialTab });
    this.loadActiveTab(initialTab);
  },

  onPullDownRefresh() {
    this.loadActiveTab(this.data.activeTab).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ==================== Tab 切换 ====================

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.loadActiveTab(tab);
  },

  loadActiveTab(tab) {
    if (tab === 'dashboard') return this.loadDashboard();
    if (tab === 'users') return this.loadUsers(true);
    if (tab === 'items') return this.loadItems(true);
    if (tab === 'verifications') return this.loadVerifications(true);
    if (tab === 'reports') return this.loadReports(true);
    return Promise.resolve();
  },

  buildFileUrl(url) {
    if (!url) return '';
    if (/^https?:/.test(url)) return url;
    return `${getBaseURL()}${url}`;
  },

  // ==================== 仪表盘 ====================

  async loadDashboard() {
    this.setData({ loading: true });
    try {
      const [dashboard, analytics] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getStatsReport(this.buildStatsParams())
      ]);
      this.setData({
        dashboard: dashboard || {},
        analytics: this.formatAnalytics(analytics || {}),
        loading: false
      });
    } catch (error) {
      console.error('[Admin] loadDashboard error:', error);
      this.setData({ loading: false });
    }
  },

  buildStatsParams() {
    const { statsFilter } = this.data;
    const params = {
      period: statsFilter.period
    };

    if (statsFilter.period === 'day') {
      params.startDate = statsFilter.endDate;
    }

    if (statsFilter.period === 'custom') {
      params.startDate = statsFilter.startDate;
      params.endDate = statsFilter.endDate;
    }

    if (Number(statsFilter.campusIndex) > 0) {
      params.campusArea = Number(statsFilter.campusIndex) - 1;
    }

    return params;
  },

  formatAnalytics(report) {
    const summary = report.summary || {};
    const categories = (report.categories || []).map(item => ({
      ...item,
      categoryText: CATEGORY_LIST.find(c => c.id === item.category)?.name || '未知分类',
      dealRateText: `${Math.round(Number(item.dealRate || 0) * 100)}%`
    }));
    const topItems = (report.topItems || []).map(item => ({
      ...item,
      categoryText: CATEGORY_LIST.find(c => c.id === item.category)?.name || '未知分类'
    }));
    const campus = (report.campus || []).map(item => ({
      ...item,
      campusText: CAMPUS_AREA_MAP[item.campusArea]?.label || '未知校区'
    }));
    const daily = (report.daily || []).map(item => ({
      ...item,
      turnoverText: formatPrice(item.turnoverAmount)
    }));

    return {
      ...report,
      summary: {
        ...summary,
        turnoverText: formatPrice(summary.turnoverAmount),
        dealRateText: `${Math.round(Number(summary.dealRate || 0) * 100)}%`,
        averageDealDaysText: Number(summary.averageDealDays || 0).toFixed(1)
      },
      daily,
      campus,
      categories,
      topItems
    };
  },

  onStatsPeriodChange(e) {
    const { period } = e.currentTarget.dataset;
    this.setData({ 'statsFilter.period': period });
    this.loadDashboard();
  },

  onStatsCampusChange(e) {
    this.setData({ 'statsFilter.campusIndex': Number(e.detail.value) });
    this.loadDashboard();
  },

  onStatsDateChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`statsFilter.${field}`]: e.detail.value });
    if (this.data.statsFilter.period === 'custom') {
      this.loadDashboard();
    }
  },

  async onExportStats() {
    try {
      const csv = await adminApi.exportStats(this.buildStatsParams());
      wx.setClipboardData({
        data: csv,
        success: () => wx.showToast({ title: 'CSV已复制', icon: 'success' })
      });
    } catch (error) {
      console.error('[Admin] exportStats error:', error);
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
    const isBanned = banned === 'true' || banned === true;

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
          await itemsApi.changeStatus(itemid, 4);
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

  // ==================== 认证审核 ====================

  async loadVerifications(reset = false) {
    if (this.data.loadingVerifications) return;

    const page = reset ? 1 : this.data.verificationPage + 1;
    this.setData({ loadingVerifications: true });

    try {
      const result = await adminApi.getVerifications({ page, pageSize: 20, status: 0 });
      const verifications = (result.verifications || result.applications || []).map(item => ({
        ...item,
        timeText: formatTime(item.createdAt),
        proofUrl: this.buildFileUrl(item.certificateImageUrl)
      }));

      this.setData({
        verifications: reset ? verifications : [...this.data.verifications, ...verifications],
        verificationPage: page,
        verificationHasMore: verifications.length >= 20,
        loadingVerifications: false
      });
    } catch (error) {
      console.error('[Admin] loadVerifications error:', error);
      this.setData({ loadingVerifications: false });
    }
  },

  onPreviewVerificationImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  onHandleVerification(e) {
    const { applicationid, approve, realname } = e.currentTarget.dataset;
    const approveFlag = approve === 'true' || approve === true;

    wx.showModal({
      title: approveFlag ? '通过认证' : '驳回认证',
      content: approveFlag ? `确定通过「${realname}」的 L2 认证？` : `请输入驳回「${realname}」认证的原因`,
      editable: !approveFlag,
      placeholderText: '驳回原因',
      success: async (res) => {
        if (!res.confirm) return;
        const note = (res.content || '').trim();
        if (!approveFlag && !note) {
          wx.showToast({ title: '请填写驳回原因', icon: 'none' });
          return;
        }

        try {
          await adminApi.handleVerification(applicationid, approveFlag, note);
          wx.showToast({ title: approveFlag ? '已通过' : '已驳回', icon: 'success' });
          this.loadVerifications(true);
          this.loadDashboard();
        } catch (error) {
          console.error('[Admin] handleVerification error:', error);
        }
      }
    });
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
