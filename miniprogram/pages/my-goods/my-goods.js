/**
 * 我发布的商品页
 * 展示当前用户发布的所有商品，支持下架/编辑操作
 *
 */

const itemsApi = require('../../api/items');
const {
  CATEGORY_LIST,
  ITEM_STATUS,
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
    this.loadMyGoods();
  },

  onPullDownRefresh() {
    this.loadMyGoods().finally(() => wx.stopPullDownRefresh());
  },

  /**
   * 加载我的商品
   */
  async loadMyGoods() {
    this.setData({ loading: true });
    try {
      const result = await itemsApi.getMyItems();
      this.setData({
        list: (result || []).map(this.formatItem),
        loading: false
      });
    } catch (error) {
      console.error('[MyGoods] loadMyGoods error:', error);
      this.setData({ loading: false });
    }
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
   * 编辑商品
   * 注意：publish 是 TabBar 页面，不能用 navigateTo
   * 使用全局变量传递编辑 ID，然后 switchTab
   */
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    app.globalData.editItemId = id;  // 设置要编辑的商品 ID
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  /**
   * 下架商品
   */
  onTakeOffline(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;

    wx.showModal({
      title: '下架商品',
      content: `确定要下架「${title}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await itemsApi.changeStatus(id, ITEM_STATUS.INACTIVE);
          wx.showToast({ title: '已下架', icon: 'success' });
          this.loadMyGoods();
        } catch (error) {
          console.error('[MyGoods] takeOffline error:', error);
        }
      }
    });
  },

  /**
   * 重新上架
   */
  onRelist(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '重新上架',
      content: '确定要重新上架该商品吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await itemsApi.changeStatus(id, ITEM_STATUS.ACTIVE);
          wx.showToast({ title: '已上架', icon: 'success' });
          this.loadMyGoods();
        } catch (error) {
          console.error('[MyGoods] relist error:', error);
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
   * 去发布
   */
  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  }
});
