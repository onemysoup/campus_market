/**
 * 商品详情页
 * 展示商品信息、卖家信息、收藏/取消收藏、购买锁单
 */

const itemsApi = require('../../api/items');
const transactionsApi = require('../../api/transactions');
const profileApi = require('../../api/profile');
const {
  CATEGORY_LIST,
  CAMPUS_AREA_MAP,
  CONDITION_LIST,
  COLLEGE_LIST,
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
    collegeText: '',
    statusText: '',
    statusColor: '',
    priceText: '',
    timeText: '',
    // 卖家信誉
    sellerRating: 0,
    sellerReviewCount: 0,
    sellerReviews: [],      // 当前展示的评价（默认前3条）
    sellerAllReviews: [],   // 全部评价
    reviewsExpanded: false,
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
        collegeText: detail.targetCollege != null
          ? (COLLEGE_LIST.find(c => c.id === detail.targetCollege)?.name || '')
          : '',
        statusText: ITEM_STATUS_MAP[detail.status]?.label || '',
        statusColor: ITEM_STATUS_MAP[detail.status]?.color || '',
        priceText: formatPrice(detail.price),
        timeText: formatTime(detail.createdAt),
        loading: false
      });

      // 拉取卖家信誉评价（失败不影响详情展示）
      const sellerId = detail.seller && detail.seller.userId;
      if (sellerId) {
        transactionsApi.getUserReviews(sellerId).then((r) => {
          const all = (r.reviews || []).map(item => ({
            ...item,
            timeText: formatTime(item.createdAt)
          }));
          this.setData({
            sellerRating: r.average || 0,
            sellerReviewCount: r.count || 0,
            sellerAllReviews: all,
            sellerReviews: all.slice(0, 3),
            reviewsExpanded: false
          });
        }).catch(() => {});
      }
    } catch (error) {
      console.error('[GoodsDetail] loadDetail error:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 展开/收起全部评价
  onToggleReviews() {
    const expanded = !this.data.reviewsExpanded;
    this.setData({
      reviewsExpanded: expanded,
      sellerReviews: expanded ? this.data.sellerAllReviews : this.data.sellerAllReviews.slice(0, 3)
    });
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
   * 点击购买/租赁
   */
  async onBuy() {
    const { goods, canBuy } = this.data;
    const isRental = goods && goods.isRental;
    const actionWord = isRental ? '租赁' : '购买';

    // 检查是否可交易
    if (!canBuy) {
      wx.showToast({ title: `该商品暂不可${actionWord}`, icon: 'none' });
      return;
    }

    // 检查登录状态
    const app = getApp();
    if (!app.checkLogin()) return;

    // 确认交易
    const priceLine = isRental
      ? (goods.rentalRate ? `\n租金：${goods.rentalRate}` : '') + (goods.deposit ? `\n押金：¥${goods.deposit}` : '')
      : `\n价格：¥${this.data.priceText}`;
    wx.showModal({
      title: `确认${actionWord}`,
      content: `确定要${actionWord}「${goods.title}」吗？${priceLine}`,
      confirmText: '确认',
      confirmColor: '#0f766e',
      success: async (res) => {
        if (!res.confirm) return;
        const securityPassword = await this.promptSecurityPassword(`确认${actionWord}`);
        if (!securityPassword) return;
        await this.createTransaction(securityPassword);
      }
    });
  },

  /**
   * 创建交易（锁单）
   */
  async createTransaction(securityPassword) {
    const { itemId } = this.data;

    wx.showLoading({ title: '下单中', mask: true });
    try {
      const transaction = await transactionsApi.createTransaction({
        itemId: itemId,
        agreedLocation: '',
        isCrossCampus: false,
        securityPassword
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
      // 未设置安全密码：引导用户先去设置（购买/租赁必须有安全密码）
      const msg = (error && error.message) || '';
      if (/设置安全密码/.test(msg)) {
        wx.showModal({
          title: '需要安全密码',
          content: '交易需要安全密码保护。你还没有设置安全密码，现在去设置吗？',
          confirmText: '去设置',
          confirmColor: '#0f766e',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/register/register?step=password' });
            }
          }
        });
      }
    }
  },

  promptSecurityPassword(title = '安全验证') {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: '请输入安全密码',
        confirmText: '确认',
        confirmColor: '#0f766e',
        success: (res) => {
          if (!res.confirm) {
            resolve('');
            return;
          }
          resolve((res.content || '').trim());
        },
        fail: () => resolve('')
      });
    });
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
      itemList: ['虚假商品', '垃圾广告', '不当内容', '欺诈行为', '🚫 拉黑该卖家'],
      success: (res) => {
        if (res.tapIndex === 4) {
          this.onBlockSeller();
          return;
        }
        const reasonMap = [0, 1, 2, 3];
        wx.navigateTo({
          url: `/pages/report/report?targetId=${goods.seller.userId}&reason=${reasonMap[res.tapIndex]}`
        });
      }
    });
  },

  // 拉黑卖家（SRS F5.3.1）
  onBlockSeller() {
    const { goods } = this.data;
    const seller = goods && goods.seller;
    if (!seller) return;
    const app = getApp();
    if (!app.checkLogin()) return;
    if (seller.userId === app.getUserId()) {
      wx.showToast({ title: '不能拉黑自己', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '拉黑卖家',
      content: `拉黑后「${seller.nickname || '该用户'}」将无法查看你的商品，也无法给你发消息。`,
      confirmText: '拉黑',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await profileApi.addBlacklist(seller.userId);
          wx.showToast({ title: '已拉黑', icon: 'success' });
        } catch (error) {
          console.error('[GoodsDetail] block error:', error);
        }
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
