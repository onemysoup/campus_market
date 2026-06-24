/**
 * 校园二手平台 - 全局常量定义
 * 与后端 .NET Enums 严格对齐，禁止手写魔改
 */

// ==================== 环境配置 ====================
const ENV_CONFIG = {
  develop: {
    baseURL: 'http://localhost:8080',
    envName: '开发环境'
  },
  trial: {
    baseURL: 'http://localhost:8080',  // 体验版地址，按需修改
    envName: '体验环境'
  },
  release: {
    baseURL: 'https://your-production-domain.com',  // 正式版地址
    envName: '正式环境'
  }
};

// 微信订阅消息模板 ID。拿到小程序后台模板后填入；留空时本地自动跳过订阅授权。
const SUBSCRIBE_TEMPLATE_IDS = {
  requestResponse: '',
  requestMatch: '',
  purchaseSuccess: 'p4v3_MtvaO3e0WHc6xCZAXRvuEt1O2UDAW_uOA4fqgA'
};

// ==================== 后端枚举映射 ====================

/**
 * ItemCategory 商品分类
 * 后端: 0=Textbook, 1=Electronics, 2=Daily, 3=Sports, 4=Clothing, 5=Stationery, 6=Instrument, 7=Ticket, 8=Other
 */
const CATEGORY_LIST = [
  { id: 0, name: '图书教材' },
  { id: 1, name: '数码电子' },
  { id: 2, name: '生活用品' },
  { id: 3, name: '运动户外' },
  { id: 4, name: '服装鞋帽' },
  { id: 5, name: '文具办公' },
  { id: 6, name: '乐器器材' },
  { id: 7, name: '票券卡类' },
  { id: 8, name: '其他' }
];

/**
 * ItemStatus 商品状态
 * 后端: 0=Draft, 1=Active, 2=Reserved, 3=Sold, 4=Inactive
 */
const ITEM_STATUS = {
  DRAFT: 0,
  ACTIVE: 1,
  RESERVED: 2,
  SOLD: 3,
  INACTIVE: 4
};

const ITEM_STATUS_MAP = {
  0: { label: '草稿', color: '#94a3b8' },
  1: { label: '在售', color: '#22c55e' },
  2: { label: '已预订', color: '#f59e0b' },
  3: { label: '已售出', color: '#ef4444' },
  4: { label: '已下架', color: '#6b7280' }
};

/**
 * ConditionLevel 成色等级
 * 后端: 0=LikeNew, 1=Excellent, 2=Good, 3=Fair, 4=Poor
 */
const CONDITION_LIST = [
  { id: 0, name: '全新' },
  { id: 1, name: '几乎全新' },
  { id: 2, name: '轻微使用痕迹' },
  { id: 3, name: '明显使用痕迹' },
  { id: 4, name: '破损但可用' }
];

/**
 * CampusArea 校区
 * 后端: 0=East, 1=West, 2=Both
 */
const CAMPUS_AREA = {
  EAST: 0,
  WEST: 1,
  BOTH: 2
};

const CAMPUS_AREA_MAP = {
  0: { label: '东校区', short: '东' },
  1: { label: '西校区', short: '西' },
  2: { label: '两校区', short: '全部' }
};

/**
 * AuthLevel 认证等级
 * 后端: 0=L0(未认证), 1=L1(邮箱认证), 2=L2(高级认证)
 */
const AUTH_LEVEL = {
  L0: 0,
  L1: 1,
  L2: 2
};

const AUTH_LEVEL_MAP = {
  0: { label: '未认证', color: '#94a3b8', canPublish: false },
  1: { label: '已认证', color: '#22c55e', canPublish: true },
  2: { label: '高级认证', color: '#3b82f6', canPublish: true }
};

/**
 * TransactionType 交易类型
 * 后端: 0=Sale, 1=Rental
 */
const TRANSACTION_TYPE = {
  SALE: 0,
  RENTAL: 1
};

const TRANSACTION_TYPE_MAP = {
  0: { label: '出售' },
  1: { label: '租赁' }
};

/**
 * ResourceType 求购资源类型
 * 后端: 0=Textbook, 1=Electronics, 2=Daily, 3=Sports, 4=Other
 */
const RESOURCE_TYPE = [
  { id: 0, name: '图书教材' },
  { id: 1, name: '数码电子' },
  { id: 2, name: '生活用品' },
  { id: 3, name: '运动户外' },
  { id: 4, name: '其他' }
];

/**
 * CollegeTag 学院标签（DDD 5.3 college_tag）
 * 后端: 0=农学院 ... 13=国际学院, 14=其他
 */
const COLLEGE_LIST = [
  { id: 0, name: '农学院' },
  { id: 1, name: '植物保护学院' },
  { id: 2, name: '动物科学技术学院' },
  { id: 3, name: '动物医学院' },
  { id: 4, name: '信息与电气工程学院' },
  { id: 5, name: '工学院' },
  { id: 6, name: '经济管理学院' },
  { id: 7, name: '人文与发展学院' },
  { id: 8, name: '理学院' },
  { id: 9, name: '食品科学与营养工程学院' },
  { id: 10, name: '水利与土木工程学院' },
  { id: 11, name: '土地科学与技术学院' },
  { id: 12, name: '生物学院' },
  { id: 13, name: '国际学院' },
  { id: 14, name: '其他' }
];

/**
 * ReportReason 举报原因
 */
const REPORT_REASON = {
  FAKE: 0,
  SPAM: 1,
  INAPPROPRIATE: 2,
  FRAUD: 3,
  OTHER: 4
};

const REPORT_REASON_MAP = {
  0: { label: '虚假商品' },
  1: { label: '垃圾广告' },
  2: { label: '不当内容' },
  3: { label: '欺诈行为' },
  4: { label: '其他原因' }
};

/**
 * TokenStatus 取货码状态
 */
const TOKEN_STATUS = {
  PENDING: 0,
  VERIFIED: 1,
  EXPIRED: 2
};

/**
 * RentalStatus 租赁状态
 */
const RENTAL_STATUS = {
  NONE: 0,
  ACTIVE: 1,
  RETURNED: 2
};

// ==================== 后端错误码 ====================

const ERROR_CODES = {
  SUCCESS: 0,
  UNAUTHORIZED: 4001,
  BAD_REQUEST: 4000,
  NOT_FOUND: 4004,
  FORBIDDEN: 4003,
  SERVER_ERROR: 5000
};

const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: '登录已失效，请重新登录',
  [ERROR_CODES.BAD_REQUEST]: '请求参数有误',
  [ERROR_CODES.NOT_FOUND]: '资源不存在',
  [ERROR_CODES.FORBIDDEN]: '无权执行此操作',
  [ERROR_CODES.SERVER_ERROR]: '服务器繁忙，请稍后再试'
};

// ==================== 工具函数 ====================

/**
 * 根据 ID 获取枚举名称
 */
function getNameById(list, id) {
  const found = list.find(item => item.id === Number(id));
  return found ? found.name : '';
}

/**
 * 格式化价格
 */
function formatPrice(price) {
  return Number(price || 0).toFixed(2);
}

/**
 * 格式化时间
 */
function parseBackendTime(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return new Date(dateStr);

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr);
  const looksLikeDateTime = dateStr.includes('T');
  return new Date(looksLikeDateTime && !hasTimezone ? `${dateStr}Z` : dateStr);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = parseBackendTime(dateStr);
  if (!date || Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = Math.max(0, now - date);

  // 1分钟内
  if (diff < 60000) return '刚刚';
  // 1小时内
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  // 24小时内
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  // 7天内
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  // 超过7天显示具体日期
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

module.exports = {
  ENV_CONFIG,
  SUBSCRIBE_TEMPLATE_IDS,
  CATEGORY_LIST,
  ITEM_STATUS,
  ITEM_STATUS_MAP,
  CONDITION_LIST,
  CAMPUS_AREA,
  CAMPUS_AREA_MAP,
  AUTH_LEVEL,
  AUTH_LEVEL_MAP,
  TRANSACTION_TYPE,
  TRANSACTION_TYPE_MAP,
  RESOURCE_TYPE,
  COLLEGE_LIST,
  REPORT_REASON,
  REPORT_REASON_MAP,
  TOKEN_STATUS,
  RENTAL_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  getNameById,
  formatPrice,
  formatTime
};
