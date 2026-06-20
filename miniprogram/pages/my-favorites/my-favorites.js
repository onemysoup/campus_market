/**
 * 我的收藏页
 * 展示当前用户收藏的商品，支持取消收藏
 *
 * TODO: 待后端提供 GET /api/v1/items/favorites 接口后对接
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
   * 生成 Mock 数据
   */
  generateMockData() {
    const items = [
      { title: 'iPhone 14 Pro Max', price: 6999 },
      { title: '考研数学复习全书', price: 45 },
      { title: '索尼 WH-1000XM5', price: 1899 },
      { title: '宿舍懒人沙发', price: 128 }
    ];

    return items.map((item, i) => ({
      itemId: `fav_item_${i}`,
      title: item.title,
      price: item.price,
      priceText: item.price.toFixed(2),
      firstImage: '',
      category: i % 8,
      categoryText: CATEGORY_LIST[i % 8]?.name || '',
      status: 1,
      statusText: '在售',
      statusColor: '#22c55e',
      viewCount: Math.floor(Math.random() * 200),
      timeText: formatTime(new Date(Date.now() - i * 3600000).toISOString()),
      isFavorited: true
    }));
  },

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
