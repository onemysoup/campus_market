App({
  globalData: {
    token: wx.getStorageSync('token') || '',
    userInfo: wx.getStorageSync('userInfo') || null
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync('token') || '';
    this.globalData.userInfo = wx.getStorageSync('userInfo') || null;
  }
});
