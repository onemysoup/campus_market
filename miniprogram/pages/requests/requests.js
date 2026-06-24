/**
 * 求购大厅页
 * 求购帖列表浏览 + 发布求购 + 响应/续期/关闭
 */

const requestsApi = require('../../api/requests');
const itemsApi = require('../../api/items');
const { RESOURCE_TYPE, formatTime } = require('../../utils/constants');
const { requestSubscribe } = require('../../utils/subscribe');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    hasMore: true,
    loading: false,
    loadingMore: false,
    myUserId: '',
    // 发布弹窗
    showPublish: false,
    submitting: false,
    resourceTypes: RESOURCE_TYPE,
    campusOptions: [
      { value: 0, label: '东校区' },
      { value: 1, label: '西校区' },
      { value: 2, label: '两校区' }
    ],
    form: {
      title: '',
      maxPrice: '',
      isUrgent: false,
      resourceIndex: 0,
      campusIndex: 0
    }
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ myUserId: userInfo.userId || '' });
    this.fetchList(true);
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.loadingMore) {
      this.fetchList(false);
    }
  },

  // ==================== 列表 ====================

  async fetchList(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ [reset ? 'loading' : 'loadingMore']: true });

    try {
      const result = await requestsApi.getRequests({ page, pageSize: this.data.pageSize });
      const newList = (result.items || []).map(this.formatItem.bind(this));
      const totalCount = result.totalCount || 0;
      this.setData({
        list: reset ? newList : [...this.data.list, ...newList],
        page,
        totalCount,
        hasMore: (reset ? newList.length : this.data.list.length + newList.length) < totalCount,
        loading: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('[Requests] fetchList error:', error);
      this.setData({ loading: false, loadingMore: false });
    }
  },

  formatItem(item) {
    const res = RESOURCE_TYPE.find(r => r.id === item.resourceType);
    return {
      ...item,
      resourceText: res ? res.name : '其他',
      timeText: formatTime(item.createdAt),
      isMine: item.buyerId === this.data.myUserId
    };
  },

  // ==================== 发布弹窗 ====================

  openPublish() {
    const app = getApp();
    if (!app.checkLogin || !app.checkLogin()) {
      if (!wx.getStorageSync('token')) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
    }
    this.setData({ showPublish: true });
  },

  closePublish() {
    this.setData({ showPublish: false });
  },

  onTitleInput(e) {
    this.setData({ 'form.title': e.detail.value });
  },

  onMaxPriceInput(e) {
    this.setData({ 'form.maxPrice': e.detail.value });
  },

  onUrgentChange(e) {
    this.setData({ 'form.isUrgent': e.detail.value });
  },

  onResourceChange(e) {
    this.setData({ 'form.resourceIndex': Number(e.detail.value) });
  },

  onCampusChange(e) {
    this.setData({ 'form.campusIndex': Number(e.detail.value) });
  },

  async onSubmit() {
    const { form, resourceTypes, campusOptions } = this.data;
    if (!form.title.trim()) {
      wx.showToast({ title: '请输入求购标题', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      await requestSubscribe(['requestResponse', 'requestMatch']);
      await requestsApi.createRequest({
        title: form.title.trim(),
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        isUrgent: form.isUrgent,
        resourceType: resourceTypes[form.resourceIndex].id,
        campusArea: campusOptions[form.campusIndex].value
      });
      wx.showToast({ title: '发布成功', icon: 'success' });
      this.setData({
        showPublish: false,
        form: { title: '', maxPrice: '', isUrgent: false, resourceIndex: 0, campusIndex: 0 }
      });
      this.fetchList(true);
    } catch (error) {
      console.error('[Requests] submit error:', error);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ==================== 列表操作 ====================

  /**
   * "我有它"：选一件自己在售的商品来响应求购帖
   */
  async onRespond(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '加载我的商品', mask: true });
    let activeItems = [];
    try {
      const myItems = await itemsApi.getMyItems();
      // 只能用在售（status===1 Active）的商品响应
      activeItems = (myItems || []).filter(i => i.status === 1);
    } catch (error) {
      wx.hideLoading();
      console.error('[Requests] getMyItems error:', error);
      return;
    }
    wx.hideLoading();

    if (activeItems.length === 0) {
      wx.showModal({
        title: '暂无在售商品',
        content: '“我有它”需要选一件你正在出售的商品。要先去发布一件商品吗？',
        confirmText: '去发布',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/publish/publish' });
        }
      });
      return;
    }

    // 弹出商品选择列表
    wx.showActionSheet({
      itemList: activeItems.map(i => `${i.title}（¥${i.price}）`),
      success: async (res) => {
        const item = activeItems[res.tapIndex];
        try {
          const r = await requestsApi.respondRequest(id, item.itemId);
          wx.showToast({ title: r.message || '已响应', icon: 'none' });
          this.fetchList(true);
        } catch (error) {
          console.error('[Requests] respond error:', error);
        }
      }
    });
  },

  /**
   * 发布者查看自己求购帖收到的响应商品，点击可进商品详情联系卖家
   */
  async onViewResponses(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const result = await requestsApi.getResponses(id);
      const items = result.items || [];
      wx.hideLoading();
      if (items.length === 0) {
        wx.showToast({ title: '还没有人响应', icon: 'none' });
        return;
      }
      wx.showActionSheet({
        itemList: items.map(i => `${i.title}（¥${i.price}）`),
        success: (res) => {
          const item = items[res.tapIndex];
          // 进商品详情，那里有“联系卖家”
          wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${item.itemId}` });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('[Requests] getResponses error:', error);
    }
  },

  onRenew(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '续期',
      content: '将求购帖有效期延长一周？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await requestsApi.renewRequest(id);
          wx.showToast({ title: '续期成功', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[Requests] renew error:', error);
        }
      }
    });
  },

  onClose(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '关闭求购',
      content: '确认关闭这条求购帖？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await requestsApi.closeRequest(id);
          wx.showToast({ title: '已关闭', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[Requests] close error:', error);
        }
      }
    });
  }
});
