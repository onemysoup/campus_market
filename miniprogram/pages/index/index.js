/**
 * 首页
 * 展示分类导航、热门商品、最新发布
 */

const itemsApi = require('../../api/items');
const { CATEGORY_LIST, formatPrice, formatTime } = require('../../utils/constants');
const { syncTabBar } = require('../../utils/tabbar');

Page({
  data: {
    // 分类导航
    categories: CATEGORY_LIST,
    // 商品列表
    hotGoods: [],
    latestGoods: [],
    // 状态
    loading: true,
    defaultImage: '',
    statusBarHeight: 20,
    navBarHeight: 44
  },

  onLoad() {
    this.initNavigationMetrics();
    this.loadData();
  },

  onShow() {
    // 首页访问埋点（DDD 6.15 页面点击量统计）
    require('../../api/events').track('PAGE_VIEW', 'home');
    syncTabBar(this, 0);
    // 每次显示时刷新（可能从详情页返回时商品状态变了）
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  initNavigationMetrics() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = info.statusBarHeight || 20;
    let navBarHeight = 44;
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect();
      if (menu && menu.height && menu.top) {
        navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
      }
    }
    this.setData({ statusBarHeight, navBarHeight });
  },

  /**
   * 加载首页数据
   */
  async loadData() {
    this.setData({ loading: true });
    try {
      const [hotRes, latestRes] = await Promise.all([
        itemsApi.getItems({ page: 1, pageSize: 6 }),
        itemsApi.getItems({ page: 1, pageSize: 6 })
      ]);

      this.setData({
        hotGoods: (hotRes.items || []).map(this.formatItem),
        latestGoods: (latestRes.items || []).map(this.formatItem),
        loading: false
      });
    } catch (error) {
      console.error('[Index] loadData error:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化商品数据（适配 WXML 绑定）
   */
  formatItem(item) {
    const category = CATEGORY_LIST.find(c => c.id === item.category);
    return {
      ...item,
      priceText: formatPrice(item.price),
      priceDisplay: item.isRental
        ? (item.rentalRate || '租金面议')
        : (Number(item.price) === 0 ? '免费' : '¥' + formatPrice(item.price)),
      timeText: formatTime(item.createdAt),
      categoryText: category ? category.name : ''
    };
  },

  // ==================== 图片处理 ====================

  /**
   * 图片加载失败时设置为空（显示默认样式）
   */
  onImageError(e) {
    // 图片加载失败，不做处理，让 image 组件显示默认背景
  },

  // ==================== 页面跳转 ====================

  /**
   * 点击分类 → 跳转商品列表（带分类筛选）
   */
  goGoods(e) {
    const categoryId = e.currentTarget.dataset.id;
    wx.setStorageSync('goodsFilterCategory', categoryId);
    wx.switchTab({ url: '/pages/goods/goods' });
  },

  /**
   * 进入求购大厅
   */
  goRequests() {
    wx.navigateTo({ url: '/pages/requests/requests' });
  },

  /**
   * 点击商品 → 跳转详情页
   */
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` });
  }
});
