/**
 * 个人黑名单页（SRS F5.3.1）
 * 拉黑的用户无法查看我的商品、无法给我发起聊天
 */
const profileApi = require('../../api/profile');
const { formatTime } = require('../../utils/constants');

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
    this.loadBlacklist();
  },

  onPullDownRefresh() {
    this.loadBlacklist().finally(() => wx.stopPullDownRefresh());
  },

  async loadBlacklist() {
    this.setData({ loading: true });
    try {
      const data = await profileApi.getBlacklist();
      const list = (data || []).map(b => ({
        blockedId: b.blockedId,
        nickname: b.blockedNickname || '未知用户',
        timeText: formatTime(b.createdAt)
      }));
      this.setData({ list, loading: false });
    } catch (e) {
      console.error('[Blacklist] load error:', e);
      this.setData({ loading: false });
    }
  },

  onRemove(e) {
    const { blockedid, nickname } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消拉黑',
      content: `确定将「${nickname}」移出黑名单吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await profileApi.removeBlacklist(blockedid);
          this.setData({
            list: this.data.list.filter(i => i.blockedId !== blockedid)
          });
          wx.showToast({ title: '已取消拉黑', icon: 'success' });
        } catch (err) {
          console.error('[Blacklist] remove error:', err);
        }
      }
    });
  }
});
