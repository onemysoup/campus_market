/**
 * 求购大厅页
 * 求购帖列表浏览 + 发布求购 + 响应/续期/关闭
 */

const requestsApi = require('../../api/requests');
const { RESOURCE_TYPE, formatTime } = require('../../utils/constants');

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

  onRespond(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '响应求购',
      content: '确认你有这件商品并愿意联系对方？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await requestsApi.respondRequest(id);
          wx.showToast({ title: '已响应', icon: 'success' });
          this.fetchList(true);
        } catch (error) {
          console.error('[Requests] respond error:', error);
        }
      }
    });
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
