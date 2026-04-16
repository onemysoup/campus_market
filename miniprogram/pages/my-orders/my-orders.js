const api = require('../../api/index');
const { ORDER_STATUS_MAP, ensureLogin } = require('../../utils/util');

Page({
  data: {
    tab: 'buyer',
    statusMap: ORDER_STATUS_MAP,
    orders: [],
    goodsList: [],
    favorList: []
  },

  onLoad(options) {
    if (!ensureLogin()) return;
    if (options.tab) {
      this.setData({ tab: options.tab });
    }
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
    this.loadData();
  },

  async loadData() {
    try {
      const { tab } = this.data;
      this.setData({ orders: [], goodsList: [], favorList: [] });
      if (tab === 'buyer') {
        const data = await api.getBuyerOrders();
        this.setData({ orders: data.list || [] });
      } else if (tab === 'seller') {
        const data = await api.getSellerOrders();
        this.setData({ orders: data.list || [] });
      } else if (tab === 'publish') {
        const data = await api.getMyGoods();
        this.setData({ goodsList: data.list || [] });
      } else {
        const data = await api.getFavorList();
        this.setData({ favorList: data.list || [] });
      }
    } catch (error) {
    }
  },

  async confirmOrder(e) {
    try {
      await api.confirmOrder(e.currentTarget.dataset.id);
      this.loadData();
    } catch (error) {
    }
  },

  async cancelOrder(e) {
    try {
      await api.cancelOrder(e.currentTarget.dataset.id, { cancel_reason: '用户主动取消' });
      this.loadData();
    } catch (error) {
    }
  },

  async completeOrder(e) {
    try {
      await api.completeOrder(e.currentTarget.dataset.id);
      this.loadData();
    } catch (error) {
    }
  },

  editGoods(e) {
    wx.navigateTo({ url: `/pages/publish/publish?id=${e.currentTarget.dataset.id}` });
  },

  async offlineGoods(e) {
    try {
      await api.deleteGoods(e.currentTarget.dataset.id);
      this.loadData();
    } catch (error) {
    }
  },

  async cancelFavor(e) {
    try {
      await api.unfavorGoods(e.currentTarget.dataset.id);
      this.loadData();
    } catch (error) {
    }
  }
});
