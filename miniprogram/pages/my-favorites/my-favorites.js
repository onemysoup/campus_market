/**
 * 我的收藏页
 * 展示当前用户收藏的商品，支持取消收藏
 *
 */

const itemsApi = require('../../api/items');
const {
  CATEGORY_LIST,
  ITEM_STATUS_MAP,
  formatPrice,
  formatTime
} = require('../../utils/constants');

Page({
  data: {
    // 商品列表
    list: [],
    // 加载状态
    loading: false,
    // 默认图片
    defaultImage: ''
  },

  onLoad() {
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }
    this.loadFavorites();
  },

  onPullDownRefresh() {
    this.loadFavorites().finally(() => wx.stopPullDownRefresh());
  },

  /**
   * 加载收藏列表
   */
  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const result = await itemsApi.getFavorites();
      this.setData({
        list: (result || []).map(this.formatItem),
        loading: false
      });
    } catch (error) {
      console.error('[MyFavorites] loadFavorites error:', error);
      this.setData({ loading: false });
    }
  },

  /**

  /**
   * 格式化商品数据
   */
  formatItem(item) {
    return {
      ...item,
      priceText: formatPrice(item.price),
      timeText: formatTime(item.createdAt),
      categoryText: CATEGORY_LIST.find(c => c.id === item.category)?.name || '',
      statusText: ITEM_STATUS_MAP[item.status]?.label || '',
      statusColor: ITEM_STATUS_MAP[item.status]?.color || ''
    };
  },

  // ==================== 操作 ====================

  /**
   * 取消收藏
   */
  async onUnfavorite(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;

    wx.showModal({
      title: '取消收藏',
      content: `确定取消收藏「${title}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await itemsApi.removeFavorite(id);
          wx.showToast({ title: '已取消收藏', icon: 'success' });
          // 从列表中移除
          const list = this.data.list.filter(item => item.itemId !== id);
          this.setData({ list });
        } catch (error) {
          console.error('[MyFavorites] unfavorite error:', error);
        }
      }
    });
  },

  /**
   * 查看详情
   */
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` });
  },

  /**
   * 去逛逛
   */
  goBrowse() {
    wx.switchTab({ url: '/pages/goods/goods' });
  }
});
