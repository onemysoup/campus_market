/**
 * 校园二手平台 - 网络请求层封装
 * 统一拦截器、错误处理、环境切换
 */

const { ENV_CONFIG, ERROR_CODES, ERROR_MESSAGES } = require('./constants');

// ==================== 环境判断 ====================

/**
 * 获取当前运行环境
 * develop  - 开发版（微信开发者工具）
 * trial    - 体验版
 * release  - 正式版
 */
function getEnvType() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.envVersion || 'develop';
  } catch (e) {
    return 'develop';
  }
}

/**
 * 获取当前环境的 baseURL
 */
function getBaseURL() {
  const envType = getEnvType();
  const config = ENV_CONFIG[envType] || ENV_CONFIG.develop;
  return config.baseURL;
}

// ==================== 请求封装 ====================

const BASE_URL = getBaseURL();

/**
 * 统一请求函数
 * @param {Object} options
 * @param {string} options.url     - 接口路径（不含 baseURL）
 * @param {string} options.method  - 请求方法，默认 GET
 * @param {Object} options.data    - 请求数据
 * @param {boolean} options.showLoading - 是否显示 loading，默认 false
 * @param {boolean} options.showError   - 是否自动弹出错误提示，默认 true
 * @param {boolean} options.raw         - 是否直接返回原始响应体，默认 false
 * @param {number} options.timeout      - 请求超时时间，默认 15000ms
 * @param {Object} options.header  - 自定义 header
 */
function request(options = {}) {
  const {
    url,
    method = 'GET',
    data = {},
    showLoading = false,
    showError = true,
    raw = false,
    timeout = 15000,
    header = {}
  } = options;

  // 显示 loading
  if (showLoading) {
    wx.showLoading({ title: '加载中', mask: true });
  }

  // 读取 Token
  const token = wx.getStorageSync('token') || '';

  // 构建请求 header
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header
  };

  // 注入 Authorization
  if (token) {
    requestHeader['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: requestHeader,
      timeout,
      success: (res) => {
        const statusCode = res.statusCode;
        const result = res.data || {};

        // HTTP 状态码异常处理
        if (statusCode >= 400) {
          handleHttpError(statusCode, result, showError);
          reject(result);
          return;
        }

        if (raw) {
          resolve(res.data);
          return;
        }

        // 业务状态码处理
        if (result.code === ERROR_CODES.SUCCESS) {
          resolve(result.data);
        } else {
          handleBusinessError(result, showError);
          reject(result);
        }
      },
      fail: (error) => {
        console.error('[Request Failed]', url, error);
        if (showError) {
          wx.showToast({
            title: '网络连接失败，请检查网络',
            icon: 'none',
            duration: 2000
          });
        }
        reject(error);
      },
      complete: () => {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

// ==================== 错误处理 ====================

/**
 * HTTP 状态码错误处理
 */
function handleHttpError(statusCode, result, showError) {
  let message = '';

  switch (statusCode) {
    case 401:
      message = result.message || '登录已失效，请重新登录';
      handleUnauthorized(message);
      break;
    case 403:
      message = '无权执行此操作';
      break;
    case 404:
      message = '请求的资源不存在';
      break;
    case 400:
      message = result.message || '请求参数有误';
      break;
    case 500:
      message = '服务器繁忙，请稍后再试';
      break;
    default:
      message = `请求异常(${statusCode})`;
  }

  if (showError) {
    wx.showToast({ title: message, icon: 'none', duration: 2000 });
  }
}

/**
 * 业务错误码处理
 */
function handleBusinessError(result, showError) {
  const code = result.code;
  const message = result.message || ERROR_MESSAGES[code] || '操作失败';

  if (code === ERROR_CODES.UNAUTHORIZED) {
    handleUnauthorized(message);
    return;
  }

  if (showError) {
    wx.showToast({ title: message, icon: 'none', duration: 2000 });
  }
}

/**
 * 处理未授权（清除登录态，跳转登录页）
 */
function handleUnauthorized(message = '登录已失效，请重新登录') {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  try {
    const app = getApp();
    if (app && typeof app.onLogout === 'function') {
      app.onLogout();
    }
  } catch (e) {
    // getApp 在极早期初始化阶段可能不可用，忽略即可。
  }

  // 避免多次跳转
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentRoute = currentPage ? currentPage.route : '';

  if (currentRoute !== 'pages/login/login') {
    wx.showModal({
      title: '提示',
      content: message,
      showCancel: false,
      success: () => {
        wx.navigateTo({ url: '/pages/login/login' });
      }
    });
  }
}

// ==================== 快捷方法 ====================

function get(url, data, options = {}) {
  return request({ url, method: 'GET', data, ...options });
}

function post(url, data, options = {}) {
  return request({ url, method: 'POST', data, ...options });
}

function put(url, data, options = {}) {
  return request({ url, method: 'PUT', data, ...options });
}

function del(url, data, options = {}) {
  return request({ url, method: 'DELETE', data, ...options });
}

function patch(url, data, options = {}) {
  return request({ url, method: 'PATCH', data, ...options });
}

/**
 * 文件上传
 * @param {string} url      - 上传接口路径
 * @param {string} filePath - 本地文件路径
 * @param {string} name     - 文件字段名，默认 'file'
 * @param {Object} formData - 额外表单数据
 */
function upload(url, filePath, name = 'file', formData = {}) {
  const token = wx.getStorageSync('token') || '';

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode >= 400) {
          wx.showToast({ title: '上传失败', icon: 'none' });
          reject(res);
          return;
        }

        try {
          const result = JSON.parse(res.data || '{}');
          if (result.code === ERROR_CODES.SUCCESS) {
            resolve(result.data);
          } else {
            wx.showToast({ title: result.message || '上传失败', icon: 'none' });
            reject(result);
          }
        } catch (e) {
          wx.showToast({ title: '上传响应解析失败', icon: 'none' });
          reject(e);
        }
      },
      fail: (error) => {
        wx.showToast({ title: '上传网络异常', icon: 'none' });
        reject(error);
      }
    });
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  patch,
  upload,
  getBaseURL,
  getEnvType
};
