# 校园二手交易平台

```
├── src/              # .NET 后端（Clean Architecture）
└── miniprogram/      # 微信小程序前端
```

## 启动后端（供前端开发）

### 方式一：Docker Compose（推荐）

只需 Docker，无需安装 .NET SDK。

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

需要安装 [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)，并自行启动 MySQL 和 Redis。

```bash
cd src

# 应用数据库迁移
dotnet ef database update

# 启动 API
cd WebAPI
ASPNETCORE_ENVIRONMENT=Development dotnet run

# 后端地址: http://localhost:5242
# Swagger:   http://localhost:5242/swagger
```

## 启动前端

```bash
cd miniprogram

# 安装依赖（仅首次）
npm install

# 在微信开发者工具中打开 miniprogram/ 后，点击：
# 工具 → 构建 npm
```

> 若未构建 npm，聊天实时推送不可用，REST 收发消息仍正常。

## 测试账号（开发演示）

首次启动自动创建，仅用于开发演示，非稳定逻辑：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@cau.edu.cn | 123456 | 管理员 |
| demo1@cau.edu.cn | 123456 | 普通用户（东校区） |
| demo2@cau.edu.cn | 123456 | 普通用户（西校区） |

## 后端项目结构

```
src/
├── Domain/              # 领域实体、枚举、DTO（纯 C#）
├── Infrastructure/      # EF Core、Redis、邮件、定时任务
└── WebAPI/              # Controller、Middleware、Hub
```
