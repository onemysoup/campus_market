/**
 * 管理后台页
 * 仪表盘 + 举报处理 + 用户封禁 + 信用分调整
 *
 * 权限要求：仅 Admin 角色可访问
 */

const adminApi = require('../../api/admin');
const {
  REPORT_REASON_MAP,
  ITEM_STATUS_MAP,
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
      { key: 'reports', label: '举报处理', icon: '🚨' }
    ],
    // 举报列表
    reports: [],
    reportPage: 1,
    reportHasMore: true,
    // 加载状态
    loading: false,
    loadingReports: false,
    // 操作弹窗
    showActionModal: false,
    actionType: '',  // 'handleReport' | 'toggleBan' | 'adjustCredit'
    actionData: {},
    actionLoading: false,
    // 举报处理表单
    reportForm: {
      accept: true,
      note: ''
    },
    // 信用分调整表单
    creditForm: {
      userId: '',
      delta: '',
      reason: ''
    }
  },

  onLoad() {
    // 权限硬性判断
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

    this.setData({ isAdmin: true });
    this.loadDashboard();
  },

  onPullDownRefresh() {
    this.loadDashboard().finally(() => wx.stopPullDownRefresh());
  },

  // ==================== Tab 切换 ====================

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });

    if (tab === 'dashboard') {
      this.loadDashboard();
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

  // ==================== 举报列表 ====================

  async loadReports(reset = false) {
    if (this.data.loadingReports) return;

    const page = reset ? 1 : this.data.reportPage + 1;
    this.setData({ loadingReports: true });

    try {
      const result = await adminApi.getReports({
        page,
        pageSize: 10
      });

      const newList = reset
        ? (result.reports || [])
        : [...this.data.reports, ...(result.reports || [])];

      this.setData({
        reports: newList,
        reportPage: page,
        reportHasMore: newList.length < (result.totalCount || 0),
        loadingReports: false
      });
    } catch (error) {
      console.error('[Admin] loadReports error:', error);
      this.setData({ loadingReports: false });
    }
  },

  onReportReachBottom() {
    if (this.data.reportHasMore && !this.data.loadingReports) {
      this.loadReports(false);
    }
  },

  // ==================== 操作弹窗 ====================

  /**
   * 打开处理举报弹窗
   */
  onHandleReport(e) {
    const report = e.currentTarget.dataset.report;
    this.setData({
      showActionModal: true,
      actionType: 'handleReport',
      actionData: report,
      reportForm: { accept: true, note: '' }
    });
  },

  /**
   * 打开封禁用户弹窗
   */
  onToggleBan(e) {
    const userId = e.currentTarget.dataset.userid;
    const nickname = e.currentTarget.dataset.nickname;
    const isBanned = e.currentTarget.dataset.banned;

    wx.showModal({
      title: isBanned ? '解封用户' : '封禁用户',
      content: `确定要${isBanned ? '解封' : '封禁'}用户「${nickname}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await adminApi.toggleBan(userId, !isBanned);
          wx.showToast({ title: isBanned ? '已解封' : '已封禁', icon: 'success' });
          this.loadDashboard();
        } catch (error) {
          console.error('[Admin] toggleBan error:', error);
        }
      }
    });
  },

  /**
   * 打开调整信用分弹窗
   */
  onAdjustCredit(e) {
    const userId = e.currentTarget.dataset.userid;
    const nickname = e.currentTarget.dataset.nickname;

    this.setData({
      showActionModal: true,
      actionType: 'adjustCredit',
      actionData: { userId, nickname },
      creditForm: { userId, delta: '', reason: '' }
    });
  },

  /**
   * 关闭弹窗
   */
  onCloseModal() {
    this.setData({ showActionModal: false });
  },

  /**
   * 阻止冒泡
   */
  onStopPropagation() {},

  // ==================== 表单输入 ====================

  onReportAcceptChange(e) {
    this.setData({ 'reportForm.accept': e.detail.value });
  },

  onReportNoteInput(e) {
    this.setData({ 'reportForm.note': e.detail.value });
  },

  onCreditDeltaInput(e) {
    this.setData({ 'creditForm.delta': e.detail.value });
  },

  onCreditReasonInput(e) {
    this.setData({ 'creditForm.reason': e.detail.value });
  },

  // ==================== 提交操作 ====================

  /**
   * 提交举报处理
   */
  async onSubmitReport() {
    const { actionData, reportForm } = this.data;
    this.setData({ actionLoading: true });

    try {
      await adminApi.handleReport(
        actionData.id,
        reportForm.accept,
        reportForm.note
      );

      wx.showToast({ title: '处理成功', icon: 'success' });
      this.setData({ showActionModal: false });
      this.loadReports(true);
      this.loadDashboard();
    } catch (error) {
      console.error('[Admin] handleReport error:', error);
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  /**
   * 提交信用分调整
   */
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
      await adminApi.adjustCredit(
        creditForm.userId,
        delta,
        creditForm.reason.trim()
      );

      wx.showToast({ title: '调整成功', icon: 'success' });
      this.setData({ showActionModal: false });
      this.loadDashboard();
    } catch (error) {
      console.error('[Admin] adjustCredit error:', error);
    } finally {
      this.setData({ actionLoading: false });
    }
  }
});
