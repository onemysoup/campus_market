/**
 * SignalR 实时消息服务
 * 基于 signalr-for-wx 库封装
 *
 * 使用方式：
 *   1. 在微信开发者工具中：工具 → 构建 npm
 *   2. 在页面中引入：
 *      const signalr = require('../../utils/signalr');
 *      signalr.connect(token);
 *      signalr.onMessage((msg) => { ... });
 *
 * 若未构建 npm，SignalR 不可用，REST 收发消息仍正常工作。
 *
 * 采用 LongPolling 而非 WebSocket 的原因：
 *   微信小程序的 WebSocket（wx.connectSocket）无法携带自定义请求头，
 *   而 JWT 认证需要通过 Authorization header 传递。
 *   LongPolling 使用标准 HTTP 请求，可正常携带 token 完成认证。
 *   详见 SDD 4.4.2：「采用 wx.connectSocket 或长轮询」。
 */

const BASE_URL = require('./constants').ENV_CONFIG.develop.baseURL;

let signalr = null;
try {
  signalr = require('signalr-for-wx');
} catch (e) {
  console.warn('[SignalR] signalr-for-wx 未构建，实时推送不可用');
}

let connection = null;
let isConnected = false;
let messageHandler = null;

/**
 * 建立 SignalR 连接
 * @param {string} token - JWT 令牌
 */
function connect(token) {
  if (!signalr) return;
  if (connection && isConnected) return;

  connection = new signalr.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/hubs/chat?access_token=${token}`)
    .configureLogging(signalr.LogLevel.Warning)
    .build();

  connection.on('ReceiveMessage', (message) => {
    console.log('[SignalR] ReceiveMessage:', message);
    if (messageHandler) {
      messageHandler(message);
    }
  });

  connection.onclose((error) => {
    console.warn('[SignalR] Connection closed:', error);
    isConnected = false;
  });

  connection.start()
    .then(() => {
      console.log('[SignalR] Connected');
      isConnected = true;
    })
    .catch((err) => {
      console.error('[SignalR] Connection failed:', err);
      isConnected = false;
    });
}

/**
 * 断开 SignalR 连接
 */
function disconnect() {
  if (connection) {
    connection.stop();
    connection = null;
    isConnected = false;
  }
}

/**
 * 注册消息接收回调
 * @param {Function} handler - (message) => void
 */
function onMessage(handler) {
  messageHandler = handler;
}

/**
 * 移除消息接收回调
 */
function offMessage() {
  messageHandler = null;
}

module.exports = {
  connect,
  disconnect,
  onMessage,
  offMessage,
  get isConnected() { return isConnected; }
};
