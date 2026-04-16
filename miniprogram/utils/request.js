const BASE_URL = 'http://127.0.0.1:3000/api';

function request({ url, method = 'GET', data = {}, showLoading = false }) {
  if (showLoading) {
    wx.showLoading({ title: '加载中' });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: wx.getStorageSync('token') ? `Bearer ${wx.getStorageSync('token')}` : ''
      },
      success: (res) => {
        const result = res.data || {};
        if (result.code === 0) {
          resolve(result.data);
          return;
        }

        if (result.code === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.showToast({ title: '登录已失效', icon: 'none' });
          wx.navigateTo({ url: '/pages/login/login' });
        } else {
          wx.showToast({ title: result.message || '请求失败', icon: 'none' });
        }
        reject(result);
      },
      fail: (error) => {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(error);
      },
      complete: () => {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

module.exports = request;
