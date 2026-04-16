const api = require('../../api/index');
const { ensureLogin } = require('../../utils/util');

Page({
  data: {
    isAdmin: false,
    users: [],
    pendingGoods: [],
    stats: {},
    statsType: 'day',
    statsTypeLabel: '按天',
    types: [
      { value: 'day', label: '按天' },
      { value: 'week', label: '按周' },
      { value: 'month', label: '按月' }
    ]
  },

  onShow() {
    if (!ensureLogin()) return;
    const user = wx.getStorageSync('userInfo') || {};
    const isAdmin = user.role === 'admin';
    this.setData({ isAdmin });
    if (isAdmin) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    if (!this.data.isAdmin) return;
    try {
      const [users, pendingGoods, stats] = await Promise.all([
        api.getAdminUsers(),
        api.getPendingGoods(),
        api.getStats({ type: this.data.statsType })
      ]);
      this.setData({
        users: users.list || [],
        pendingGoods: pendingGoods.list || [],
        stats: stats || {}
      });
    } catch (error) {
    }
  },

  onTypeChange(e) {
    const item = this.data.types[Number(e.detail.value)];
    this.setData({ statsType: item.value, statsTypeLabel: item.label });
    this.loadData();
  },

  async toggleUser(e) {
    try {
      await api.toggleUser(e.currentTarget.dataset.id);
      this.loadData();
    } catch (error) {
    }
  },

  async review(e) {
    try {
      const action = e.currentTarget.dataset.action;
      await api.reviewGoods(e.currentTarget.dataset.id, { action });
      this.loadData();
    } catch (error) {
    }
  }
});
