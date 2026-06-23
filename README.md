# 校园二手交易平台

基于微信小程序 + .NET Clean Architecture 的校园二手交易系统。

```
├── src/              # .NET 后端（Clean Architecture）
├── miniprogram/      # 微信小程序前端
├── BACKEND_TODO.md   # 后端待办事项
└── .env              # 环境配置
```

## 功能特性

- ✅ 微信登录 / 邮箱密码登录
- ✅ 商品发布、浏览、搜索、收藏
- ✅ 交易下单、取货码核销
- ✅ 站内聊天（实时消息）
- ✅ 管理后台（用户管理、商品管理、举报处理）
- ✅ 文件上传（图片永久保存）

## 启动后端

### 方式一：Docker Compose（推荐）

```bash
# 1. 配置微信凭证
cp .env.example .env
# 编辑 .env 填入 WECHAT_APPID / WECHAT_APPSECRET

# 2. 一键启动 MySQL + Redis + API
docker compose up --build

# 3. 后端就绪
# API:      http://localhost:8080/api/v1/...
# Swagger:  http://localhost:8080/swagger
```

### 方式二：本地运行

需要安装 [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)，并自行启动 MySQL。

```bash
cd src/WebAPI

# 应用数据库迁移
dotnet ef database update

# 启动 API
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5070"

# 后端地址: http://localhost:5070
# Swagger:   http://localhost:5070/swagger
```

## 启动前端

使用微信开发者工具打开 `miniprogram/` 目录。

**测试账号：**

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@cau.edu.cn | 123456 | 管理员 |
| 33@cau.edu.cn | 123456 | 普通用户 |

## 项目结构

```
src/
├── Domain/              # 领域实体、枚举、DTO
├── Infrastructure/      # EF Core、邮件、定时任务
└── WebAPI/              # Controller、Middleware、Hub

miniprogram/
├── api/                 # API 接口模块
├── pages/               # 页面组件
├── utils/               # 工具函数
└── app.js               # 入口文件
```

## 相关文档

- [后端待办事项](BACKEND_TODO.md) - 后端接口需求清单
