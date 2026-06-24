/**
 * 浏览历史页（SRS F5.1 最近浏览，保存最近 20 个商品）
 */
const profileApi = require('../../api/profile');
const { formatPrice, formatTime } = require('../../utils/constants');

function formatPriceDisplay(item) {
  if (item.isRental) return item.rentalRate || '租金面议';
  if (item.price == null) return '';
  return Number(item.price) === 0 ? '免费' : `¥${formatPrice(item.price)}`;
}

Page({
  data: {
    list: [],
    loading: false
  },

  onLoad() {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  onPullDownRefresh() {
    this.loadHistory().finally(() => wx.stopPullDownRefresh());
  },

  async loadHistory() {
    this.setData({ loading: true });
    try {
      const data = await profileApi.getHistory();
      const list = (data || []).map(h => ({
        itemId: h.itemId,
        title: h.title || '商品已下架',
        priceDisplay: formatPriceDisplay(h),
        image: h.image || '',
        status: h.status,
        available: h.status === 1,
        timeText: formatTime(h.browsedAt)
      }));
      this.setData({ list, loading: false });
    } catch (e) {
      console.error('[BrowseHistory] loadHistory error:', e);
      this.setData({ loading: false });
    }
  },

  onTapItem(e) {
    const { itemid, available } = e.currentTarget.dataset;
    if (!available) {
      wx.showToast({ title: '该商品已下架', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${itemid}` });
  },

  onClear() {
    if (this.data.list.length === 0) return;
    wx.showModal({
      title: '清空浏览历史',
      content: '确定清空全部浏览记录吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await profileApi.clearHistory();
          this.setData({ list: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        } catch (e) {
          console.error('[BrowseHistory] clear error:', e);
        }
      }
    });
  }
});
