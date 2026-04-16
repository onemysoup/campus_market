const request = require('../utils/request');

const api = {
  register: (data) => request({ url: '/auth/register', method: 'POST', data }),
  login: (data) => request({ url: '/auth/login', method: 'POST', data }),
  wxLogin: (data) => request({ url: '/auth/wx-login', method: 'POST', data }),
  resetPassword: (data) => request({ url: '/auth/password', method: 'PUT', data }),
  getProfile: () => request({ url: '/user/profile' }),
  updateProfile: (data) => request({ url: '/user/profile', method: 'PUT', data }),

  getGoods: (params) => request({ url: '/goods', data: params }),
  getGoodsDetail: (id) => request({ url: `/goods/${id}` }),
  publishGoods: (data) => request({ url: '/goods', method: 'POST', data }),
  updateGoods: (id, data) => request({ url: `/goods/${id}`, method: 'PUT', data }),
  deleteGoods: (id) => request({ url: `/goods/${id}`, method: 'DELETE' }),
  getMyGoods: () => request({ url: '/goods/my' }),
  favorGoods: (id) => request({ url: `/goods/${id}/favor`, method: 'POST' }),
  unfavorGoods: (id) => request({ url: `/goods/${id}/favor`, method: 'DELETE' }),
  getFavorList: () => request({ url: '/goods/favor/list' }),

  createOrder: (data) => request({ url: '/orders', method: 'POST', data }),
  getBuyerOrders: () => request({ url: '/orders/buyer' }),
  getSellerOrders: () => request({ url: '/orders/seller' }),
  getOrderDetail: (id) => request({ url: `/orders/${id}` }),
  confirmOrder: (id) => request({ url: `/orders/${id}/confirm`, method: 'PUT' }),
  cancelOrder: (id, data) => request({ url: `/orders/${id}/cancel`, method: 'PUT', data }),
  completeOrder: (id) => request({ url: `/orders/${id}/complete`, method: 'PUT' }),

  getAdminUsers: () => request({ url: '/admin/users' }),
  toggleUser: (id) => request({ url: `/admin/users/${id}/toggle`, method: 'PUT' }),
  getPendingGoods: () => request({ url: '/admin/goods/pending' }),
  reviewGoods: (id, data) => request({ url: `/admin/goods/${id}/review`, method: 'PUT', data }),
  getStats: (params) => request({ url: '/admin/stats', data: params }),

  getConversations: () => request({ url: '/chat/conversations' }),
  getMessages: (conversationId) => request({ url: `/chat/messages/${conversationId}` }),
  sendMessage: (data) => request({ url: '/chat/messages', method: 'POST', data }),

  uploadImage: (filePath) => {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'http://127.0.0.1:3000/api/upload/image',
        filePath,
        name: 'file',
        header: {
          Authorization: wx.getStorageSync('token') ? `Bearer ${wx.getStorageSync('token')}` : ''
        },
        success: (res) => {
          const result = JSON.parse(res.data || '{}');
          if (result.code === 0) {
            resolve(result.data.url);
            return;
          }
          wx.showToast({ title: result.message || '上传失败', icon: 'none' });
          reject(result);
        },
        fail: reject
      });
    });
  }
};

module.exports = api;
