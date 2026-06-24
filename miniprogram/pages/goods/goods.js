/**
 * 商品列表页
 * 全量商品分页查询、多条件筛选、下拉刷新、触底加载
 */

const itemsApi = require('../../api/items');
const {
  CATEGORY_LIST,
  CAMPUS_AREA_MAP,
  CONDITION_LIST,
  ITEM_STATUS_MAP,
  formatPrice,
  formatTime
} = require('../../utils/constants');

Page({
  data: {
    // 列表数据
    list: [],
    // 分页
    page: 1,
    pageSize: 10,
    totalCount: 0,
    hasMore: true,
    // 加载状态
    loading: false,
    loadingMore: false,
    // 筛选条件
    keyword: '',
    category: null,
    condition: null,
    campusArea: null,
    minPrice: '',
    maxPrice: '',
    // 筛选选项
    categories: [
      { id: null, name: '全部分类' },
      ...CATEGORY_LIST
    ],
    conditions: [
      { id: null, name: '全部成色' },
      ...CONDITION_LIST
    ],
    campusOptions: [
      { value: null, label: '全部校区' },
      { value: 0, label: '东校区' },
      { value: 1, label: '西校区' }
    ],
    // 筛选器显示状态
    showFilter: false,
    // 当前选中的筛选标签
    categoryLabel: '全部分类',
    conditionLabel: '全部成色',
    campusLabel: '全部校区',
    // UI
    defaultImage: ''
  },

  filterTimer: null,

  onLoad(options) {
    // 从首页分类跳转过来时，预设分类筛选
    this.applyPresetCategory();
    this.fetchList(true);
  },

  onShow() {
    // 商品页是 Tab 页，从首页再次点分类切回时只会触发 onShow（不会重新 onLoad）
    // 因此这里也要读取预设分类，发现有新预设就重新拉取列表
    if (this.applyPresetCategory()) {
      this.fetchList(true);
    }
  },

  /**
   * 读取首页传入的预设分类筛选；应用成功返回 true
   */
  applyPresetCategory() {
    const presetCategory = wx.getStorageSync('goodsFilterCategory');
    if (presetCategory === undefined || presetCategory === null || presetCategory === '') {
      return false;
    }
    wx.removeStorageSync('goodsFilterCategory');
    const cat = this.data.categories.find(c => c.id === Number(presetCategory));
    if (cat) {
      this.setData({
        category: Number(presetCategory),
        categoryLabel: cat.name
      });
      return true;
    }
    return false;
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.loadingMore) {
      this.fetchList(false);
    }
  },

  // ==================== 数据加载 ====================

  /**
   * 获取商品列表
   * @param {boolean} reset - 是否重置（下拉刷新时为 true）
   */
  async fetchList(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    const isReset = reset;
    const page = isReset ? 1 : this.data.page + 1;

    this.setData({
      [isReset ? 'loading' : 'loadingMore']: true
    });

    try {
      // 构建查询参数（过滤空值）
      const params = {
        page,
        pageSize: this.data.pageSize
      };

      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.category !== null) params.category = this.data.category;
      if (this.data.condition !== null) params.conditionLevel = this.data.condition;
      if (this.data.campusArea !== null) params.campusArea = this.data.campusArea;
      if (this.data.minPrice) params.minPrice = Number(this.data.minPrice);
      if (this.data.maxPrice) params.maxPrice = Number(this.data.maxPrice);

      const result = await itemsApi.getItems(params);
      const newList = (result.items || []).map(this.formatItem);
      const totalCount = result.totalCount || 0;

      this.setData({
        list: isReset ? newList : [...this.data.list, ...newList],
        page,
        totalCount,
        hasMore: (isReset ? newList.length : this.data.list.length + newList.length) < totalCount,
        loading: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('[Goods] fetchList error:', error);
      this.setData({
        loading: false,
        loadingMore: false
      });
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

  // ==================== 搜索 ====================

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.fetchList(true);
  },

  onClearSearch() {
    this.setData({ keyword: '' });
    this.fetchList(true);
  },

  // ==================== 筛选 ====================

  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.categories[idx];
    this.setData({
      category: selected.id,
      categoryLabel: selected.name,
      showFilter: false
    });
    this.fetchList(true);
  },

  onConditionChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.conditions[idx];
    this.setData({
      condition: selected.id,
      conditionLabel: selected.name,
      showFilter: false
    });
    this.fetchList(true);
  },

  onCampusChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.campusOptions[idx];
    this.setData({
      campusArea: selected.value,
      campusLabel: selected.label,
      showFilter: false
    });
    this.fetchList(true);
  },

  onMinPriceInput(e) {
    this.setData({ minPrice: e.detail.value });
  },

  onMaxPriceInput(e) {
    this.setData({ maxPrice: e.detail.value });
  },

  onPriceFilterConfirm() {
    this.fetchList(true);
  },

  onResetFilter() {
    this.setData({
      keyword: '',
      category: null,
      condition: null,
      campusArea: null,
      minPrice: '',
      maxPrice: '',
      categoryLabel: '全部分类',
      conditionLabel: '全部成色',
      campusLabel: '全部校区',
      showFilter: false
    });
    this.fetchList(true);
  },

  // ==================== 页面跳转 ====================

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` });
  }
});
