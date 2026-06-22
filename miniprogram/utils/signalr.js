/**
 * SignalR 实时消息服务
 * 基于 signalr-for-wx 库封装
 *
 * 使用方式：
 *   1. 在微信开发者工具中：工具 → 构建 npm
 *   2. 在页面中引入：
 *      const signalr = require('../../services/signalr');
 *      signalr.connect(token);
 *      signalr.onMessage((msg) => { ... });
 */

const signalr = require('signalr-for-wx');

const BASE_URL = require('../utils/constants').ENV_CONFIG.develop.baseURL;

let connection = null;
let isConnected = false;
let messageHandler = null;

/**
 * 建立 SignalR 连接
 * @param {string} token - JWT 令牌
 */
function connect(token) {
  if (connection && isConnected) return;

  connection = new signalr.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/hubs/chat?access_token=${token}`)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
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
