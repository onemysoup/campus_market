/**
 * 商品详情页
 * 展示商品信息、卖家信息、收藏/取消收藏、购买锁单
 */

const itemsApi = require('../../api/items');
const transactionsApi = require('../../api/transactions');
const {
  CATEGORY_LIST,
  CAMPUS_AREA_MAP,
  CONDITION_LIST,
  ITEM_STATUS,
  ITEM_STATUS_MAP,
  formatPrice,
  formatTime
} = require('../../utils/constants');

Page({
  data: {
    // 商品 ID
    itemId: null,
    // 商品数据
    goods: null,
    // 格式化后的展示字段
    categoryText: '',
    conditionText: '',
    campusText: '',
    statusText: '',
    statusColor: '',
    priceText: '',
    timeText: '',
    // 交互状态
    isFavorited: false,
    canBuy: false,
    loading: true,
    // 图片预览
    currentImageIndex: 0,
    // 默认头像
    defaultAvatar: ''
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ itemId: options.id });
    this.loadDetail();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDetail().finally(() => wx.stopPullDownRefresh());
  },

  // ==================== 数据加载 ====================

  /**
   * 加载商品详情
   */
  async loadDetail() {
    this.setData({ loading: true });
    try {
      const detail = await itemsApi.getItem(this.data.itemId);

      // 格式化展示数据
      this.setData({
        goods: detail,
        isFavorited: detail.isFavorited || false,
        canBuy: detail.canBuy || false,
        categoryText: CATEGORY_LIST.find(c => c.id === detail.category)?.name || '',
        conditionText: CONDITION_LIST.find(c => c.id === detail.conditionLevel)?.name || '',
        campusText: CAMPUS_AREA_MAP[detail.campusArea]?.label || '',
        statusText: ITEM_STATUS_MAP[detail.status]?.label || '',
        statusColor: ITEM_STATUS_MAP[detail.status]?.color || '',
        priceText: formatPrice(detail.price),
        timeText: formatTime(detail.createdAt),
        loading: false
      });
    } catch (error) {
      console.error('[GoodsDetail] loadDetail error:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ==================== 图片轮播 ====================

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current });
  },

  /**
   * 预览大图
   */
  onPreviewImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = this.data.goods.images || [];
    wx.previewImage({ current, urls });
  },

  // ==================== 收藏操作 ====================

  /**
   * 切换收藏状态（无感切换）
   */
  async onToggleFavorite() {
    const { itemId, isFavorited } = this.data;

    // 乐观更新：先切换 UI
    this.setData({ isFavorited: !isFavorited });

    try {
      if (isFavorited) {
        await itemsApi.removeFavorite(itemId);
        wx.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        await itemsApi.addFavorite(itemId);
        wx.showToast({ title: '收藏成功', icon: 'success' });
      }
    } catch (error) {
      // 回滚：恢复原状态
      this.setData({ isFavorited });
      console.error('[GoodsDetail] toggleFavorite error:', error);
    }
  },

  // ==================== 购买/锁单 ====================

  /**
   * 点击购买
   */
  async onBuy() {
    const { goods, canBuy } = this.data;

    // 检查是否可购买
    if (!canBuy) {
      wx.showToast({ title: '该商品暂不可购买', icon: 'none' });
      return;
    }

    // 检查登录状态
    const app = getApp();
    if (!app.checkLogin()) return;

    // 确认购买
    wx.showModal({
      title: '确认购买',
      content: `确定要购买「${goods.title}」吗？\n价格：¥${this.data.priceText}`,
      confirmText: '确认',
      confirmColor: '#0f766e',
      success: async (res) => {
        if (!res.confirm) return;
        await this.createTransaction();
      }
    });
  },

  /**
   * 创建交易（锁单）
   */
  async createTransaction() {
    const { itemId } = this.data;

    wx.showLoading({ title: '下单中', mask: true });
    try {
      const transaction = await transactionsApi.createTransaction({
        itemId: itemId,
        agreedLocation: '',
        isCrossCampus: false
      });

      wx.hideLoading();

      // 刷新详情页状态
      this.loadDetail();

      var pickupCode = transaction.secureToken || "";
      var msg = pickupCode ? "\ud83d\udd11\u53d6\u8d27\u7801\uff1a" + pickupCode + "\n\n\u8bf7\u524d\u5f80\u300c\u6211\u7684\u8ba2\u5355\u300d\u4e0e\u5356\u5bb6\u4ea4\u6613" : "\u8bf7\u524d\u5f80\u300c\u6211\u7684\u8ba2\u5355\u300d\u67e5\u770b\u4ea4\u6613\u8be6\u60c5";
      wx.showModal({
        title: '🎉 下单成功',
        content: msg,
        showCancel: true,
        cancelText: '留在这里',
        confirmText: '查看订单',
        confirmColor: '#0f766e',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.navigateTo({ url: '/pages/my-orders/my-orders' });
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('[GoodsDetail] createTransaction error:', error);
    }
  },

  // ==================== 联系卖家 ====================

  /**
   * 发起聊天（跳转到消息页，然后进入聊天详情）
   */
  onContactSeller() {
    const { goods } = this.data;
    if (!goods || !goods.seller) return;

    // 检查登录状态
    const app = getApp();
    if (!app.checkLogin()) return;

    const sellerId = goods.seller.userId;
    const myId = app.getUserId();

    if (sellerId === myId) {
      wx.showToast({ title: '不能和自己聊天哦', icon: 'none' });
      return;
    }

    // 通过全局变量传递聊天参数，然后跳转到消息 Tab
    app.globalData.chatParams = {
      sellerId: sellerId,
      itemId: this.data.itemId,
      sellerNickname: goods.seller.nickname || '卖家'
    };
    wx.switchTab({ url: '/pages/chat/chat' });
  },

  // ==================== 举报 ====================

  onReport() {
    const { goods } = this.data;
    if (!goods) return;

    wx.showActionSheet({
      itemList: ['虚假商品', '垃圾广告', '不当内容', '欺诈行为'],
      success: (res) => {
        const reasonMap = [0, 1, 2, 3];
        wx.navigateTo({
          url: `/pages/report/report?targetId=${goods.seller.userId}&reason=${reasonMap[res.tapIndex]}`
        });
      }
    });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    const { goods } = this.data;
    return {
      title: goods?.title || '校园二手好物',
      path: `/pages/goods-detail/goods-detail?id=${this.data.itemId}`
    };
  }
});
