const api = require('../../api/index');
const { CATEGORY_LIST, CONDITION_LIST, ensureLogin } = require('../../utils/util');

Page({
  data: {
    goodsId: null,
    loading: false,
    categories: CATEGORY_LIST,
    conditions: CONDITION_LIST,
    categoryIndex: 0,
    conditionIndex: 0,
    categoryLabel: CATEGORY_LIST[0].name,
    conditionLabel: CONDITION_LIST[0].name,
    form: {
      title: '',
      price: '',
      category_id: CATEGORY_LIST[0].id,
      condition: CONDITION_LIST[0].id,
      description: '',
      images: []
    }
  },

  onLoad(options) {
    if (!ensureLogin()) return;
    if (options.id) {
      this.setData({ goodsId: Number(options.id) });
      this.loadGoods(Number(options.id));
    }
  },

  async loadGoods(id) {
    try {
      const goods = await api.getGoodsDetail(id);
      const categoryIndex = this.data.categories.findIndex((c) => Number(c.id) === Number(goods.category_id));
      const conditionIndex = this.data.conditions.findIndex((c) => Number(c.id) === Number(goods.condition));
      this.setData({
        form: {
          title: goods.title,
          price: goods.price,
          category_id: goods.category_id,
          condition: goods.condition,
          description: goods.description,
          images: goods.images || []
        },
        categoryIndex,
        conditionIndex,
        categoryLabel: this.data.categories[categoryIndex].name,
        conditionLabel: this.data.conditions[conditionIndex].name
      });
    } catch (error) {
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      categoryIndex: index,
      categoryLabel: this.data.categories[index].name,
      'form.category_id': this.data.categories[index].id
    });
  },

  onConditionChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      conditionIndex: index,
      conditionLabel: this.data.conditions[index].name,
      'form.condition': this.data.conditions[index].id
    });
  },

  chooseImages() {
    const remain = 6 - this.data.form.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多6张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      success: (res) => {
        const files = res.tempFiles.map((f) => f.tempFilePath);
        this.uploadImages(files);
      }
    });
  },

  async uploadImages(files) {
    try {
      wx.showLoading({ title: '上传中' });
      const urls = [];
      for (const filePath of files) {
        const url = await api.uploadImage(filePath);
        urls.push(url);
      }
      this.setData({ form: { ...this.data.form, images: this.data.form.images.concat(urls) } });
    } catch (error) {
    } finally {
      wx.hideLoading();
    }
  },

  async onSubmit() {
    if (!ensureLogin()) return;
    try {
      this.setData({ loading: true });
      if (this.data.goodsId) {
        await api.updateGoods(this.data.goodsId, this.data.form);
      } else {
        await api.publishGoods(this.data.form);
      }
      wx.showToast({ title: '提交成功', icon: 'success' });
      wx.switchTab({ url: '/pages/my/my' });
    } catch (error) {
    } finally {
      this.setData({ loading: false });
    }
  }
});
