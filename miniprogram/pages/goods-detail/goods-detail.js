const api = require('../../api/index');
const { CATEGORY_LIST, CONDITION_LIST, getNameById, ensureLogin } = require('../../utils/util');

Page({
  data: {
    id: null,
    goods: {},
    categoryName: '',
    conditionName: ''
  },

  onLoad(options) {
    this.setData({ id: Number(options.id) });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const goods = await api.getGoodsDetail(this.data.id);
      this.setData({
        goods,
        categoryName: getNameById(CATEGORY_LIST, goods.category_id),
        conditionName: getNameById(CONDITION_LIST, goods.condition)
      });
    } catch (error) {
    }
  },

  async onBuy() {
    if (!ensureLogin()) return;
    try {
      await api.createOrder({ goods_id: this.data.id });
      wx.showToast({ title: '下单成功', icon: 'success' });
    } catch (error) {
    }
  },

  async onFavor() {
    if (!ensureLogin()) return;
    try {
      await api.favorGoods(this.data.id);
      wx.showToast({ title: '收藏成功', icon: 'success' });
    } catch (error) {
    }
  },

  goChat() {
    if (!ensureLogin()) return;
    const user = wx.getStorageSync('userInfo') || {};
    const otherId = this.data.goods.seller_id;
    if (!otherId || user.id === otherId) {
      wx.showToast({ title: '无法发起聊天', icon: 'none' });
      return;
    }
    const conversationId = `${otherId}_${this.data.id}`;
    wx.navigateTo({ url: `/pages/chat/chat?conversationId=${conversationId}` });
  }
});
