/**
 * 信用记录页（SRS F5.2.3 透明度）
 * 展示当前诚信分与历次变动轨迹
 */
const profileApi = require('../../api/profile');
const { formatTime } = require('../../utils/constants');

Page({
  data: {
    creditScore: 0,
    logs: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }
    this.loadCredit();
    this.loadLogs(true);
  },

  onPullDownRefresh() {
    Promise.all([this.loadCredit(), this.loadLogs(true)])
      .finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs(false);
    }
  },

  async loadCredit() {
    try {
      const data = await profileApi.getCredit();
      this.setData({ creditScore: data.creditScore || 0 });
    } catch (e) {
      console.error('[CreditLog] loadCredit error:', e);
    }
  },

  async loadLogs(reset = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const page = reset ? 1 : this.data.page + 1;
    try {
      const data = await profileApi.getCreditLog({ page, pageSize: this.data.pageSize });
      const list = (data.logs || []).map(l => ({
        ...l,
        timeText: formatTime(l.createdAt),
        isPlus: l.changeAmount >= 0,
        amountText: (l.changeAmount >= 0 ? '+' : '') + l.changeAmount
      }));
      this.setData({
        logs: reset ? list : [...this.data.logs, ...list],
        page,
        hasMore: list.length >= this.data.pageSize,
        loading: false
      });
    } catch (e) {
      console.error('[CreditLog] loadLogs error:', e);
      this.setData({ loading: false });
    }
  }
});
