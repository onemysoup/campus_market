const api = require('../../api/index');
const { CATEGORY_LIST, CONDITION_LIST } = require('../../utils/util');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    keyword: '',
    categoryId: '',
    condition: '',
    priceMin: '',
    priceMax: '',
    sort: 'new',
    categories: [{ id: '', name: '全部' }, ...CATEGORY_LIST],
    conditions: [{ id: '', name: '全部' }, ...CONDITION_LIST],
    sortOptions: [
      { value: 'new', label: '最新' },
      { value: 'price_asc', label: '价格升序' },
      { value: 'price_desc', label: '价格降序' },
      { value: 'view_desc', label: '热门' }
    ],
    categoryLabel: '全部',
    conditionLabel: '全部',
    sortLabel: '最新',
    fallback: 'https://dummyimage.com/240x240/e2e8f0/64748b&text=Goods'
  },

  onLoad(options) {
    const presetCategory = wx.getStorageSync('goodsFilterCategory') || options.categoryId || '';
    if (presetCategory) {
      const c = this.data.categories.find((item) => Number(item.id) === Number(presetCategory));
      this.setData({ categoryId: Number(presetCategory), categoryLabel: c ? c.name : '全部' });
      wx.removeStorageSync('goodsFilterCategory');
    }
    this.fetchList(true);
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchList(false);
    }
  },

  async fetchList(reset = false) {
    this.setData({ loading: true });
    try {
      const nextPage = reset ? 1 : this.data.page + 1;
      const data = await api.getGoods({
        page: nextPage,
        pageSize: this.data.pageSize,
        keyword: this.data.keyword,
        categoryId: this.data.categoryId,
        condition: this.data.condition,
        priceMin: this.data.priceMin,
        priceMax: this.data.priceMax,
        sort: this.data.sort
      });

      const newList = reset ? data.list : this.data.list.concat(data.list || []);
      this.setData({
        list: newList,
        page: nextPage,
        hasMore: newList.length < (data.total || 0)
      });
    } catch (error) {
    } finally {
      this.setData({ loading: false });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.fetchList(true);
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.categories[idx];
    this.setData({ categoryId: selected.id, categoryLabel: selected.name });
    this.fetchList(true);
  },

  onConditionChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.conditions[idx];
    this.setData({ condition: selected.id, conditionLabel: selected.name });
    this.fetchList(true);
  },

  onSortChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.sortOptions[idx];
    this.setData({ sort: selected.value, sortLabel: selected.label });
    this.fetchList(true);
  },

  onPriceMinInput(e) {
    this.setData({ priceMin: e.detail.value });
  },

  onPriceMaxInput(e) {
    this.setData({ priceMax: e.detail.value });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${e.currentTarget.dataset.id}` });
  }
});
