/**
 * 举报页面
 */

const reportsApi = require('../../api/reports');
const { REPORT_REASON_MAP } = require('../../utils/constants');

Page({
  data: {
    targetId: '',
    reason: 0,
    reasonText: '',
    description: '',
    loading: false
  },

  onLoad(options) {
    const { targetId, reason } = options;
    this.setData({
      targetId: targetId || '',
      reason: Number(reason) || 0,
      reasonText: REPORT_REASON_MAP[Number(reason)]?.label || '未知原因'
    });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  async onSubmit() {
    const { targetId, reason, description } = this.data;

    if (!description.trim()) {
      wx.showToast({ title: '请填写举报描述', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      await reportsApi.reportUser({
        targetId,
        reasonType: reason,
        description: description.trim()
      });

      wx.showToast({ title: '举报已提交', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error) {
      console.error('[Report] submit error:', error);
    } finally {
      this.setData({ loading: false });
    }
  }
});
