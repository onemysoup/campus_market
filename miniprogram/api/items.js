/**
 * 商品模块 API
 * 对应后端: ItemsController (/api/v1/items)
 */

const { get, post, put, patch, del } = require('../utils/request');

const itemsApi = {
  /**
   * 获取商品列表（分页+筛选）
   * @param {Object} params
   * @param {string}   params.keyword     - 搜索关键词
   * @param {number}   params.category    - 分类枚举值
   * @param {number}   params.campusArea  - 校区枚举值
   * @param {number}   params.minPrice    - 最低价格
   * @param {number}   params.maxPrice    - 最高价格
   * @param {number}   params.page        - 页码，默认 1
   * @param {number}   params.pageSize    - 每页数量，默认 20
   */
  getItems(params = {}) {
    return get('/api/v1/items', params);
  },

  /**
   * 获取商品详情
   * @param {string} id - 商品 GUID
   */
  getItem(id) {
    return get(`/api/v1/items/${id}`);
  },

  /**
   * 发布商品
   * @param {Object} data
   * @param {string}   data.title          - 标题
   * @param {string}   data.description    - 描述
   * @param {number}   data.price          - 价格
   * @param {number}   data.category       - 分类枚举值
   * @param {number}   data.conditionLevel - 成色枚举值
   * @param {string[]} data.images         - 图片 URL 数组
   * @param {number}   data.campusArea     - 校区枚举值
   * @param {boolean}  data.isNegotiable   - 是否可议价
   */
  createItem(data) {
    return post('/api/v1/items', data);
  },

  /**
   * 编辑商品
   * @param {string} id   - 商品 GUID
   * @param {Object} data - 需要更新的字段（部分更新）
   */
  editItem(id, data) {
    return put(`/api/v1/items/${id}`, data);
  },

  /**
   * AI 辅助生成商品描述（SRS F2.1.7 预留接口，后端无外部模型时本地降级生成）
   * @param {Object} data
   * @param {string} data.title          - 商品标题
   * @param {number} data.category       - 分类枚举值
   * @param {number} data.conditionLevel - 成色枚举值
   * @param {string} [data.keywords]     - 关键词/卖点（选填）
   */
  aiDescribe(data) {
    return post('/api/v1/items/ai-describe', data);
  },

  /**
   * 变更商品状态（上架/下架/标记已售等）
   * @param {string} id     - 商品 GUID
   * @param {number} status - 目标状态枚举值
   */
  changeStatus(id, status) {
    return patch(`/api/v1/items/${id}/status`, { status });
  },

  /**
   * 收藏商品
   * @param {string} id - 商品 GUID
   */
  addFavorite(id) {
    return post(`/api/v1/items/${id}/favor`);
  },

  /**
   * 取消收藏
   * @param {string} id - 商品 GUID
   */
  removeFavorite(id) {
    return del(`/api/v1/items/${id}/favor`);
  },

  /**
   * 获取收藏列表
   */
  getFavorites() {
    return get('/api/v1/items/favorites');
  },

  /**
   * 获取我的商品列表
   */
  getMyItems() {
    return get('/api/v1/items/my');
  }
};

module.exports = itemsApi;
