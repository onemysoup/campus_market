const CATEGORY_LIST = [
  { id: 1, name: '数码电子' },
  { id: 2, name: '图书教材' },
  { id: 3, name: '生活用品' },
  { id: 4, name: '服装鞋帽' },
  { id: 5, name: '运动户外' },
  { id: 6, name: '美妆护肤' },
  { id: 7, name: '食品零食' },
  { id: 8, name: '其他' }
];

const CONDITION_LIST = [
  { id: 1, name: '全新' },
  { id: 2, name: '几乎全新' },
  { id: 3, name: '轻微使用痕迹' },
  { id: 4, name: '明显使用痕迹' },
  { id: 5, name: '破损但可用' }
];

const GOODS_STATUS_MAP = {
  available: '在售',
  sold: '已售出',
  offline: '已下架'
};

const ORDER_STATUS_MAP = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

function getNameById(list, id) {
  const found = list.find((item) => Number(item.id) === Number(id));
  return found ? found.name : '';
}

function ensureLogin() {
  const token = wx.getStorageSync('token');
  if (!token) {
    wx.showToast({ title: '请先登录', icon: 'none' });
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  }
  return true;
}

function formatPrice(price) {
  return Number(price || 0).toFixed(2);
}

module.exports = {
  CATEGORY_LIST,
  CONDITION_LIST,
  GOODS_STATUS_MAP,
  ORDER_STATUS_MAP,
  getNameById,
  ensureLogin,
  formatPrice
};
