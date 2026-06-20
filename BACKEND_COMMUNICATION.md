# 前后端联调沟通文档

## 一、前端分支说明

**分支名称：** `feat-frontend-base`

**核心改动：**
- 完成小程序全量页面重构，对接后端 API
- 工程基建：网络层封装、枚举常量对齐、模块化 API

---

## 二、后端临时修改（backend/test-changes 分支）

我在前端联调期间，为了测试做了一些后端临时修改，已提交到 `backend/test-changes` 分支。

### 2.1 开发环境便利性修改

| 文件 | 修改内容 | 建议处理 |
|------|----------|----------|
| `AuthController.cs` | `send-code` 接口固定验证码为 `123456`，跳过邮件发送 | **开发环境保留**，生产环境需恢复 |
| `AuthController.cs` | `wx-login` 使用固定 OpenId 模拟登录 | **开发环境保留**，生产环境需恢复真实微信 API |
| `EmailSender.cs` | SMTP 未配置时跳过发送并打印日志 | **建议保留**，增强健壮性 |

### 2.2 权限调整

| 接口 | 原权限 | 修改后 | 原因 |
|------|--------|--------|------|
| `PUT /api/v1/auth/campus` | AuthLevelL1 | AuthLevelL0 | 新用户需要设置校区 |
| `PUT /api/v1/auth/profile` | 无 | AuthLevelL0 | **新增接口**，更新用户昵称头像 |
| `GET /api/v1/users/{id}/credit` | AuthLevelL1 | AuthLevelL0 | 查看信用分不应限制 |
| `POST /api/v1/auth/verify-email` | 无认证 | AuthLevelL0 | 需要用户已登录才能绑定邮箱 |

### 2.3 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/v1/auth/login` | POST | 邮箱密码登录 |
| `PUT /api/v1/auth/profile` | POST | 更新用户昵称头像 |
| `GET /api/v1/items/my` | GET | 获取当前用户发布的商品 |
| `GET /api/v1/items/favorites` | GET | 获取收藏列表 |
| `GET /api/v1/transactions` | GET | 获取交易列表（支持 buyer/seller 角色筛选） |

---

## 三、前端已对接的接口清单

### 3.1 认证模块 `/api/v1/auth`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `POST /wx-login` | login.js 微信登录 | ✅ |
| `POST /login` | login.js 邮箱登录 | ✅ |
| `POST /send-code` | register.js 发送验证码 | ✅ |
| `POST /verify-email` | register.js 验证邮箱 | ✅ |
| `POST /set-password` | register.js 设置密码 | ✅ |
| `PUT /campus` | login.js 新用户设置校区 | ✅ |
| `PUT /profile` | my.js 修改昵称头像 | ✅ |

### 3.2 商品模块 `/api/v1/items`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `GET /` | index.js, goods.js 商品列表 | ✅ |
| `GET /{id}` | goods-detail.js 商品详情 | ✅ |
| `POST /` | publish.js 发布商品 | ✅ |
| `PUT /{id}` | publish.js 编辑商品 | ✅ |
| `PATCH /{id}/status` | my-goods.js 下架/上架 | ✅ |
| `POST /{id}/favor` | goods-detail.js 收藏 | ✅ |
| `DELETE /{id}/favor` | my-favorites.js 取消收藏 | ✅ |
| `GET /my` | my-goods.js 我的商品 | ✅ |
| `GET /favorites` | my-favorites.js 收藏列表 | ✅ |

### 3.3 交易模块 `/api/v1/transactions`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `POST /` | goods-detail.js 创建交易 | ✅ |
| `GET /` | my-orders.js 订单列表 | ✅ |
| `POST /{id}/cancel` | my-orders.js 取消交易 | ✅ |
| `POST /{id}/verify` | my-orders.js 核销取货码 | ✅ |

### 3.4 聊天模块 `/api/v1/chats`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `GET /` | chat.js 会话列表 | ⚠️ 未对接（使用本地存储） |
| `GET /{id}/messages` | chat-detail.js 消息历史 | ⚠️ 未对接（使用本地存储） |
| `POST /messages` | chat-detail.js 发送消息 | ⚠️ 未对接（使用本地存储） |

### 3.5 用户资料 `/api/v1/users/{id}`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `GET /credit` | my.js 信用分 | ✅ |

### 3.6 管理后台 `/api/v1/admin`

| 接口 | 前端调用位置 | 状态 |
|------|-------------|------|
| `GET /stats/dashboard` | admin.js 仪表盘 | ✅ |
| `GET /reports` | admin.js 举报列表 | ✅ |
| `PATCH /reports/{id}` | admin.js 处理举报 | ✅ |
| `PATCH /users/{id}/ban` | admin.js 封禁用户 | ✅ |
| `POST /users/{id}/credit` | admin.js 调整信用分 | ✅ |

---

## 四、🔴 未完成功能（需要后端配合）

### 4.1 聊天消息同步（优先级：高）

**现状：** 前端使用本地存储，无法跨用户同步消息

**需要后端实现：**

```
POST /api/v1/chats/send
{
  "sessionId": "xxx",
  "receiverId": "xxx",
  "content": "消息内容",
  "msgType": 0  // 0=文本, 1=图片
}

GET /api/v1/chats
返回：会话列表，包含对方头像昵称、最后消息、未读数

GET /api/v1/chats/{sessionId}/messages?page=1&pageSize=50
返回：消息历史
```

**前端数据结构（ChatCardVO）：**
```javascript
{
  sessionId: "buyerId_sellerId_itemId",
  itemId: "商品ID",
  itemTitle: "商品标题",
  itemPrice: 99.00,
  itemImage: "商品图片",
  // 卖家信息
  sellerId: "卖家ID",
  sellerNickname: "卖家昵称",
  sellerAvatar: "卖家头像",
  // 买家信息
  buyerId: "买家ID",
  buyerNickname: "买家昵称",
  buyerAvatar: "买家头像",
  // 最后消息
  lastMessage: "消息内容",
  updateTime: "2026-06-20T10:00:00Z",
  unreadCount: 3
}
```

**会话唯一标识：** 基于 `买家ID + 卖家ID + 商品ID` 三元组

### 4.2 实时消息推送（优先级：中）

**建议方案：**
- 方案A：WebSocket（SignalR）- 体验最好
- 方案B：轮询 - 实现简单，每 5 秒查询一次新消息
- 方案C：微信订阅消息 - 离线推送

### 4.3 图片上传（优先级：中）

**现状：** 前端使用 Mock 方案（保存本地临时文件路径）

**需要后端实现：**
```
POST /api/v1/upload
Content-Type: multipart/form-data

返回：
{
  "code": 0,
  "data": {
    "url": "https://xxx.com/images/xxx.jpg"
  }
}
```

---

## 五、数据库密码

`appsettings.Development.json` 中的数据库密码已替换为占位符 `your_password_here`，请自行配置。

---

## 六、联系方式

如有问题，请随时沟通！
