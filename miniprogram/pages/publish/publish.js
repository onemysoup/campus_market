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
const MONEY_FINAL_PATTERN = /^(0|[1-9]\d{0,4})(\.\d{1,2})?$/;

function createInitialForm() {
  return {
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
    deposit: '',
    supportCrossCampus: false
  };
}

function sanitizeMoneyInput(value) {
  let text = String(value || '').replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');
  if (firstDot >= 0) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  if (text.startsWith('.')) text = '0' + text;
  const parts = text.split('.');
  parts[0] = parts[0].replace(/^0+(?=\d)/, '');
  if (parts[0].length > 5) parts[0] = parts[0].slice(0, 5);
  if (parts.length > 1) {
    parts[1] = parts[1].slice(0, 2);
    text = `${parts[0] || '0'}.${parts[1]}`;
  } else {
    text = parts[0];
  }
  return text;
}

function isValidMoney(value, allowZero) {
  const text = String(value || '').trim();
  if (!MONEY_FINAL_PATTERN.test(text)) return false;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 99999) return false;
  return allowZero ? amount >= 0 : amount > 0;
}

Page({
  data: {
    // 编辑模式
    editMode: false,
    itemId: null,
    // 表单数据
    form: createInitialForm(),
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
    // 发布模式下尝试恢复上次未提交的草稿（编辑模式由 onShow 接管，不恢复）
    if (!app.globalData.editItemId) {
      this.restoreDraft();
    }
  },

  /**
   * 草稿缓存 key（按用户隔离，避免不同账号串草稿）
   */
  getDraftKey() {
    const app = getApp();
    const uid = (app.globalData.userInfo && app.globalData.userInfo.userId) || 'guest';
    return 'publishDraft_' + uid;
  },

  /**
   * 保存草稿（仅发布模式，自动暂存表单到本地）
   */
  saveDraft() {
    if (this.data.editMode) return;
    wx.setStorageSync(this.getDraftKey(), {
      form: this.data.form,
      categoryIndex: this.data.categoryIndex,
      conditionIndex: this.data.conditionIndex,
      campusIndex: this.data.campusIndex,
      collegeIndex: this.data.collegeIndex
    });
  },

  setDataAndSaveDraft(data) {
    this.setData(data, () => this.saveDraft());
  },

  clearDraft() {
    wx.removeStorageSync(this.getDraftKey());
  },

  /**
   * 恢复草稿
   */
  restoreDraft() {
    const draft = wx.getStorageSync(this.getDraftKey());
    if (!draft || !draft.form) return;
    // 只有有实质内容时才恢复，避免空草稿打扰
    if (!draft.form.title && !draft.form.description && (draft.form.images || []).length === 0) return;
    this.setData({
      form: { ...this.data.form, ...draft.form },
      categoryIndex: draft.categoryIndex || 0,
      conditionIndex: draft.conditionIndex || 0,
      campusIndex: draft.campusIndex || 0,
      collegeIndex: draft.collegeIndex || 0
    });
    wx.showToast({ title: '已恢复上次草稿', icon: 'none' });
  },

  onShow() {
    const app = getApp();

    // 用户切换检测：tabBar 页面实例会复用，换账号后清空上个用户残留的表单并恢复本人草稿
    const curUid = app.getUserId();
    if (this._lastUserId !== undefined && this._lastUserId !== curUid) {
      this.resetForm();
      if (!app.globalData.editItemId) this.restoreDraft();
    }
    this._lastUserId = curUid;

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
      form: createInitialForm(),
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
          deposit: detail.deposit != null ? String(detail.deposit) : '',
          supportCrossCampus: detail.supportCrossCampus === true
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
    this.setDataAndSaveDraft({ 'form.title': e.detail.value });
  },

  onDescInput(e) {
    this.setDataAndSaveDraft({ 'form.description': e.detail.value });
  },

  /**
   * AI 智能生成描述（SRS F2.1.7）：依据标题/分类/成色生成描述并填入
   */
  async onAiDescribe() {
    const { form } = this.data;
    if (!form.title.trim()) {
      wx.showToast({ title: '请先填写标题', icon: 'none' });
      return;
    }
    wx.showLoading({ title: 'AI 生成中', mask: true });
    try {
      const res = await itemsApi.aiDescribe({
        title: form.title.trim(),
        category: form.category,
        conditionLevel: form.conditionLevel,
        keywords: form.description.trim() || '',
        images: form.images || []
      });
      if (res && res.description) {
        this.setDataAndSaveDraft({ 'form.description': res.description });
        wx.showToast({ title: '已生成，可继续编辑', icon: 'none' });
      }
    } catch (error) {
      console.error('[Publish] aiDescribe error:', error);
    } finally {
      wx.hideLoading();
    }
  },

  onPriceInput(e) {
    this.setDataAndSaveDraft({ 'form.price': sanitizeMoneyInput(e.detail.value) });
  },

  // 可议价：与「0元赠送」「租赁」互斥（赠送/租赁场景无单一售价可议）
  onNegotiableChange(e) {
    const isNegotiable = e.detail.value;
    if (isNegotiable) {
      this.setDataAndSaveDraft({
        'form.isNegotiable': true,
        'form.isFree': false,
        'form.isRental': false
      });
    } else {
      this.setDataAndSaveDraft({ 'form.isNegotiable': false });
    }
  },

  // 0元赠送：与「可议价」「租赁」互斥
  onFreeChange(e) {
    const isFree = e.detail.value;
    if (isFree) {
      this.setDataAndSaveDraft({
        'form.isFree': true,
        'form.price': '0',
        'form.isNegotiable': false,
        'form.isRental': false
      });
    } else {
      this.setDataAndSaveDraft({ 'form.isFree': false, 'form.price': '' });
    }
  },

  // ==================== 租赁 ====================

  // 租赁：与「0元赠送」「可议价」互斥；租赁商品无售价，只有租金+押金
  onRentalChange(e) {
    const isRental = e.detail.value;
    if (isRental) {
      this.setDataAndSaveDraft({
        'form.isRental': true,
        'form.isFree': false,
        'form.isNegotiable': false,
        'form.price': ''
      });
    } else {
      this.setDataAndSaveDraft({ 'form.isRental': false });
    }
  },

  onRentalRateInput(e) {
    this.setDataAndSaveDraft({ 'form.rentalRate': sanitizeMoneyInput(e.detail.value) });
  },

  onDepositInput(e) {
    this.setDataAndSaveDraft({ 'form.deposit': sanitizeMoneyInput(e.detail.value) });
  },

  // ==================== Picker 选择 ====================

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setDataAndSaveDraft({
      categoryIndex: index,
      'form.category': CATEGORY_LIST[index].id
    });
  },

  onConditionChange(e) {
    const index = Number(e.detail.value);
    this.setDataAndSaveDraft({
      conditionIndex: index,
      'form.conditionLevel': CONDITION_LIST[index].id
    });
  },

  onCampusChange(e) {
    const index = Number(e.detail.value);
    this.setDataAndSaveDraft({
      campusIndex: index,
      'form.campusArea': this.data.campusOptions[index].value
    });
  },

  onCollegeChange(e) {
    const index = Number(e.detail.value);
    this.setDataAndSaveDraft({
      collegeIndex: index,
      'form.targetCollege': this.data.colleges[index].id
    });
  },

  onCrossCampusChange(e) {
    this.setDataAndSaveDraft({ 'form.supportCrossCampus': e.detail.value });
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
      }, () => this.saveDraft());

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
    this.setDataAndSaveDraft({ 'form.images': images });
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

    // 租赁商品：校验租金（无售价）；非租赁：校验售价
    if (form.isRental) {
      if (!isValidMoney(form.rentalRate, false)) {
        wx.showToast({ title: '请填写合法租金', icon: 'none' });
        return false;
      }
      if (form.deposit !== '' && !isValidMoney(form.deposit, true)) {
        wx.showToast({ title: '请填写合法押金', icon: 'none' });
        return false;
      }
    } else if (form.price === '' || !isValidMoney(form.price, form.isFree) || (!form.isFree && Number(form.price) <= 0)) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return false;
    }

    if (Number(form.price) > 99999) {
      wx.showToast({ title: '价格不能超过99999', icon: 'none' });
      return false;
    }

    // 商品图片为可选项（不强制上传）

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
        price: (form.isFree || form.isRental) ? 0 : Number(form.price),
        category: form.category,
        conditionLevel: form.conditionLevel,
        campusArea: form.campusArea,
        targetCollege: form.targetCollege,
        supportCrossCampus: form.supportCrossCampus,
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
        this.clearDraft();  // 发布成功清除本地草稿
        this.resetForm();   // tabBar 页面会复用实例，需要同步清掉内存表单
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
