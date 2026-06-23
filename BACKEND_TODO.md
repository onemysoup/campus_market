# 后端待办事项 - 前端联调需求

## 一、✅ 已实现

### 1. 文件上传接口 ✅

**接口：** `POST /api/v1/files/upload`

**实现：**
- 保存到 `src/WebAPI/wwwroot/images/` 目录
- 文件名使用 GUID 避免冲突
- 返回永久有效的 URL：`http://localhost:5070/images/xxx.jpg`

**前端已对接：** `api/files.js` + `pages/publish/publish.js`

---

## 二、🔴 待实现（影响核心功能）

### 2. 获取当前用户信息接口

**问题：** 清除缓存后，用户头像昵称丢失，无法恢复。

**需求：**
```http
GET /api/v1/auth/me
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "userId": "xxx",
    "nickname": "xxx",
    "avatarUrl": "xxx",
    "email": "xxx@cau.edu.cn",
    "authLevel": 1,
    "roleType": "Student",
    "creditScore": 85
  }
}
```

---

## 三、🟡 建议实现（提升体验）

### 3. 邮箱注册接口

**问题：** 目前只有微信登录自动注册，没有邮箱注册功能。

**需求：**
```http
POST /api/v1/auth/register
```

**参数：**
```json
{
  "email": "xxx@cau.edu.cn",
  "password": "123456",
  "nickname": "张同学"
}
```

---

### 4. 聊天消息实时推送

**问题：** 目前消息需要手动刷新才能看到。

**建议方案：**

- 方案A：WebSocket（SignalR）- 体验最好
- 方案B：轮询 - 实现简单，每 5 秒查询一次新消息

---

## 三、🟢 可选优化

### 5. 会话删除接口

```
DELETE /api/v1/chats/{sessionId}
```

### 6. 消息已读状态更新

```
PUT /api/v1/chats/{sessionId}/read
```

---

## 四、已完成后端修改

以下是前端联调期间完成的后端修改：

| 文件 | 修改内容 | 状态 |
| ---- | -------- | ---- |
| FilesController.cs | 文件上传接口 | ✅ 已完成 |
| AuthController.cs | 邮箱登录接口 | ✅ 已完成 |
| AuthController.cs | 更新用户资料接口 | ✅ 已完成 |
| ItemsController.cs | 我的商品列表接口 | ✅ 已完成 |
| ItemsController.cs | 收藏列表接口 | ✅ 已完成 |
| TransactionsController.cs | 交易列表接口 | ✅ 已完成 |
| AdminController.cs | 用户列表接口 | ✅ 已完成 |
| ProfileController.cs | 权限改为 AuthLevelL0 | ✅ 已完成 |
| ChatController.cs | 会话返回 sellerId | ✅ 已完成 |

---

## 五、测试账号

| 邮箱 | 密码 | 角色 |
| ---- | ---- | ---- |
| admin@cau.edu.cn | 123456 | 管理员 |
| 33@cau.edu.cn | 123456 | 普通用户 |
| 1234@cau.edu.cn | 123456 | 普通用户 |

---

## 六、联系方式

如有问题请随时沟通！
