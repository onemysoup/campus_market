# 校园二手交易平台（微信小程序 + Node.js）

软件工程课程大作业：实现校园二手交易平台，支持用户认证、商品管理、订单交易、管理员审核与站内聊天。

## 1. 技术栈

- 前端：微信小程序原生开发（WXML + WXSS + JS）
- 后端：Node.js + Express
- 数据库：MySQL + Sequelize ORM
- 认证：JWT
- 上传：multer（本地存储）

## 2. 项目结构

```text
.
├── server
│   ├── app.js
│   ├── config/db.js
│   ├── middleware
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models
│   │   ├── User.js
│   │   ├── Goods.js
│   │   ├── Order.js
│   │   ├── Favorite.js
│   │   ├── Message.js
│   │   └── index.js
│   ├── routes
│   │   ├── auth.js
│   │   ├── goods.js
│   │   ├── orders.js
│   │   ├── admin.js
│   │   ├── chat.js
│   │   └── upload.js
│   └── utils/response.js
└── miniprogram
    ├── app.js
    ├── app.json
    ├── app.wxss
    ├── api/index.js
    ├── utils
    │   ├── request.js
    │   └── util.js
    └── pages
```

## 3. 环境准备

- Node.js >= 18
- MySQL >= 8.0
- 微信开发者工具（导入 `miniprogram` 目录）

## 4. 数据库初始化

### 4.1 创建数据库

```sql
CREATE DATABASE campus_secondhand DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 4.2 配置后端环境变量

```bash
cd server
cp .env.example .env
```

根据本机 MySQL 修改 `.env`：

```env
PORT=3000
BASE_URL=http://127.0.0.1:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=campus_secondhand
DB_USER=root
DB_PASS=123456
JWT_SECRET=campus_secondhand_secret
ADMIN_PHONE=18800000000
ADMIN_PASSWORD=Admin@123456
```

说明：后端首次启动会自动 `sequelize.sync({ alter: true })` 建表，并自动创建默认管理员账号（若不存在）。

## 5. 启动命令

### 5.1 启动后端

```bash
cd server
npm install
npm run dev
```

默认服务地址：`http://127.0.0.1:3000`

### 5.2 启动小程序

1. 打开微信开发者工具
2. 导入目录：`miniprogram`
3. 使用测试号（`touristappid`）或替换为你自己的 AppID
4. 在开发者工具内编译运行

## 6. 测试账号

- 管理员（自动创建）
  - 手机号：`18800000000`
  - 密码：`Admin@123456`
- 买家/卖家：在注册页自行注册
- 修改密码验证码（演示版）：`123456`

## 7. 接口说明

所有响应统一格式：

```json
{ "code": 0, "message": "success", "data": {} }
```

### 7.1 认证与用户

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/wx-login`
- `PUT /api/auth/password`
- `GET /api/user/profile`
- `PUT /api/user/profile`

### 7.2 商品

- `GET /api/goods`
- `GET /api/goods/:id`
- `POST /api/goods`
- `PUT /api/goods/:id`
- `DELETE /api/goods/:id`
- `GET /api/goods/my`
- `POST /api/goods/:id/favor`
- `DELETE /api/goods/:id/favor`
- `GET /api/goods/favor/list`

### 7.3 订单

- `POST /api/orders`
- `GET /api/orders/buyer`
- `GET /api/orders/seller`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/confirm`
- `PUT /api/orders/:id/cancel`
- `PUT /api/orders/:id/complete`

### 7.4 管理员

- `GET /api/admin/users`
- `PUT /api/admin/users/:id/toggle`
- `GET /api/admin/goods/pending`
- `PUT /api/admin/goods/:id/review`
- `GET /api/admin/stats`

### 7.5 聊天与上传

- `GET /api/chat/conversations`
- `GET /api/chat/messages/:conversationId`
- `POST /api/chat/messages`
- `POST /api/upload/image`

## 8. 功能完成情况对照

- 用户认证：注册、登录、微信登录、改密、token 持久化
- 用户管理：角色、资料展示编辑、管理员封禁/解封
- 商品管理：发布、编辑、下架、分类/价格/成色/关键词筛选、收藏、审核
- 交易管理：下单、确认、取消、收货完成、买卖双方订单列表
- 管理后台：用户管理、商品审核、统计
- 站内聊天：会话列表、消息列表、发送消息

## 9. 注意事项

- 小程序中 `utils/request.js` 默认后端地址为 `http://127.0.0.1:3000/api`。
- 真机调试时需将地址替换为本机局域网 IP（例如 `http://192.168.x.x:3000/api`）。
- 管理员审核通过后，商品才会在商品列表中展示。
