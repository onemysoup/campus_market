/**
 * 发布/编辑商品页
 * 支持多图上传（Mock）、表单校验、发布/编辑闭环
 */

const itemsApi = require('../../api/items');
const filesApi = require('../../api/files');
const {
  CATEGORY_LIST,
  CAMPUS_AREA_MAP,
  CONDITION_LIST,
  COLLEGE_LIST,
  formatPrice
} = require('../../utils/constants');

// 学院为可选项，列表首位提供「不关联学院」(id=null)
const COLLEGE_OPTIONS = [{ id: null, name: '不关联学院' }, ...COLLEGE_LIST];

Page({
  data: {
    // 编辑模式
    editMode: false,
    itemId: null,
    // 表单数据
    form: {
      title: '',
      description: '',
      price: '',
      category: 0,
      conditionLevel: 0,
      campusArea: 0,
      targetCollege: null,
      images: [],
      isNegotiable: true,
      isFree: false,
      // 租赁相关
      isRental: false,
      rentalRate: '',
      deposit: ''
    },
    // Picker 索引
    categoryIndex: 0,
    conditionIndex: 0,
    campusIndex: 0,
    collegeIndex: 0,
    // Picker 选项
    categories: CATEGORY_LIST,
    conditions: CONDITION_LIST,
    colleges: COLLEGE_OPTIONS,
    campusOptions: [
      { value: 0, label: '东校区' },
      { value: 1, label: '西校区' },
      { value: 2, label: '两校区' }
    ],
    // 图片限制
    maxImages: 6,
    // 提交状态
    submitting: false
  },

  onLoad(options) {
    // 检查登录状态
    const app = getApp();
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }
  },

  onShow() {
    const app = getApp();

    // 检查是否从"我的商品"页面跳转过来编辑
    if (app.globalData.editItemId) {
      const editId = app.globalData.editItemId;
      app.globalData.editItemId = null;  // 清除，避免重复编辑

      this.setData({
        editMode: true,
        itemId: editId
      });
      wx.setNavigationBarTitle({ title: '编辑商品' });
      this.loadGoodsDetail(editId);
    } else if (this.data.editMode) {
      // 从编辑页面返回时，重置为发布模式
      this.resetForm();
    }
  },

  /**
   * 重置表单为发布模式
   */
  resetForm() {
    this.setData({
      editMode: false,
      itemId: null,
      form: {
        title: '',
        description: '',
        price: '',
        category: 0,
        conditionLevel: 0,
        campusArea: 0,
        targetCollege: null,
        images: [],
        isNegotiable: true,
        isFree: false,
        isRental: false,
        rentalRate: '',
        deposit: ''
      },
      categoryIndex: 0,
      conditionIndex: 0,
      campusIndex: 0,
      collegeIndex: 0
    });
    wx.setNavigationBarTitle({ title: '发布商品' });
  },

  /**
   * 加载商品详情（编辑模式）
   */
  async loadGoodsDetail(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const detail = await itemsApi.getItem(id);

      // 查找 Picker 索引
      const categoryIndex = CATEGORY_LIST.findIndex(c => c.id === detail.category);
      const conditionIndex = CONDITION_LIST.findIndex(c => c.id === detail.conditionLevel);
      const campusIndex = [0, 1, 2].indexOf(detail.campusArea);
      const collegeValue = detail.targetCollege != null ? detail.targetCollege : null;
      const collegeIndex = COLLEGE_OPTIONS.findIndex(c => c.id === collegeValue);

      this.setData({
        form: {
          title: detail.title || '',
          description: detail.description || '',
          price: String(detail.price || ''),
          category: detail.category || 0,
          conditionLevel: detail.conditionLevel || 0,
          campusArea: detail.campusArea || 0,
          targetCollege: collegeValue,
          images: detail.images || [],
          isNegotiable: detail.isNegotiable !== false,
          isFree: Number(detail.price || 0) === 0,
          isRental: detail.isRental === true,
          rentalRate: detail.rentalRate || '',
          deposit: detail.deposit != null ? String(detail.deposit) : ''
        },
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        conditionIndex: conditionIndex >= 0 ? conditionIndex : 0,
        campusIndex: campusIndex >= 0 ? campusIndex : 0,
        collegeIndex: collegeIndex >= 0 ? collegeIndex : 0
      });
    } catch (error) {
      console.error('[Publish] loadGoodsDetail error:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      wx.navigateBack();
    } finally {
      wx.hideLoading();
    }
  },

  // ==================== 表单输入 ====================

  onTitleInput(e) {
    this.setData({ 'form.title': e.detail.value });
  },

  onDescInput(e) {
    this.setData({ 'form.description': e.detail.value });
  },

  onPriceInput(e) {
    this.setData({ 'form.price': e.detail.value });
  },

  onNegotiableChange(e) {
    this.setData({ 'form.isNegotiable': e.detail.value });
  },

  onFreeChange(e) {
    const isFree = e.detail.value;
    this.setData({
      'form.isFree': isFree,
      'form.price': isFree ? '0' : this.data.form.price
    });
  },

  // ==================== 租赁 ====================

  onRentalChange(e) {
    this.setData({ 'form.isRental': e.detail.value });
  },

  onRentalRateInput(e) {
    this.setData({ 'form.rentalRate': e.detail.value });
  },

  onDepositInput(e) {
    this.setData({ 'form.deposit': e.detail.value });
  },

  // ==================== Picker 选择 ====================

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      categoryIndex: index,
      'form.category': CATEGORY_LIST[index].id
    });
  },

  onConditionChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      conditionIndex: index,
      'form.conditionLevel': CONDITION_LIST[index].id
    });
  },

  onCampusChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      campusIndex: index,
      'form.campusArea': this.data.campusOptions[index].value
    });
  },

  onCollegeChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      collegeIndex: index,
      'form.targetCollege': this.data.colleges[index].id
    });
  },

  // ==================== 图片上传（Mock 方案） ====================

  /**
   * 选择图片
   */
  onChooseImage() {
    const { images, maxImages } = this.data.form;
    const remain = maxImages - images.length;

    if (remain <= 0) {
      wx.showToast({ title: `最多上传${maxImages}张`, icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(f => f.tempFilePath);
        this.uploadImages(tempFiles);
      }
    });
  },

  /**
   * 上传图片（真实上传到后端服务器）
   */
  async uploadImages(tempFiles) {
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const uploadedUrls = [];

      for (let i = 0; i < tempFiles.length; i++) {
        try {
          // 调用后端上传接口
          const result = await filesApi.uploadImage(tempFiles[i]);
          uploadedUrls.push(result.url);
        } catch (e) {
          console.error('[Publish] upload failed:', e);
          wx.showToast({ title: '图片上传失败', icon: 'none' });
          return;
        }
      }

      this.setData({
        'form.images': [...this.data.form.images, ...uploadedUrls]
      });

      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (error) {
      console.error('[Publish] uploadImages error:', error);
      wx.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.form.images];
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current,
      urls: this.data.form.images
    });
  },

  // ==================== 表单校验 ====================

  validateForm() {
    const { form } = this.data;

    if (!form.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return false;
    }

    if (form.title.trim().length < 2) {
      wx.showToast({ title: '标题至少2个字', icon: 'none' });
      return false;
    }

    if (form.price === '' || Number(form.price) < 0 || (!form.isFree && Number(form.price) <= 0)) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return false;
    }

    if (Number(form.price) > 99999) {
      wx.showToast({ title: '价格不能超过99999', icon: 'none' });
      return false;
    }

    if (form.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return false;
    }

    return true;
  },

  // ==================== 提交 ====================

  async onSubmit() {
    if (!this.validateForm()) return;
    if (this.data.submitting) return;

    const app = getApp();
    if (!app.checkLogin()) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    try {
      const { form, editMode, itemId } = this.data;

      // 构建提交数据（对齐后端 DTO）
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.isFree ? 0 : Number(form.price),
        category: form.category,
        conditionLevel: form.conditionLevel,
        campusArea: form.campusArea,
        targetCollege: form.targetCollege,
        images: form.images,
        isNegotiable: form.isNegotiable,
        isRental: form.isRental
      };

      // 租赁商品才传租金/押金
      if (form.isRental) {
        payload.rentalRate = form.rentalRate ? String(form.rentalRate).trim() : null;
        payload.deposit = form.deposit ? Number(form.deposit) : null;
      }

      if (editMode) {
        // 编辑模式：PUT；学院置空时显式告知后端清除
        if (form.targetCollege == null) payload.clearCollege = true;
        await itemsApi.editItem(itemId, payload);
        wx.showToast({ title: '修改成功', icon: 'success' });
      } else {
        // 新增模式：POST
        await itemsApi.createItem(payload);
        wx.showToast({ title: '发布成功', icon: 'success' });
      }

      // 延迟返回，让用户看到提示
      setTimeout(() => {
        // 发布页是 TabBar 页面，使用 switchTab 返回首页
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (error) {
      console.error('[Publish] onSubmit error:', error);
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  }
});
