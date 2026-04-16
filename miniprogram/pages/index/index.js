const api = require('../../api/index');
const { CATEGORY_LIST } = require('../../utils/util');

Page({
  data: {
    categories: CATEGORY_LIST,
    hotGoods: [],
    latestGoods: [],
    defaultImage: 'https://dummyimage.com/240x240/e2e8f0/64748b&text=Goods'
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    try {
      const [hot, latest] = await Promise.all([
        api.getGoods({ sort: 'view_desc', page: 1, pageSize: 6 }),
        api.getGoods({ sort: 'new', page: 1, pageSize: 6 })
      ]);
      this.setData({
        hotGoods: hot.list || [],
        latestGoods: latest.list || []
      });
    } catch (error) {
    }
  },

  goGoods(e) {
    const categoryId = e.currentTarget.dataset.id;
    wx.setStorageSync('goodsFilterCategory', categoryId);
    wx.switchTab({ url: '/pages/goods/goods' });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${e.currentTarget.dataset.id}` });
  }
});
