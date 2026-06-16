# 校园二手交易平台

ASP.NET Core 10 + EF Core + SignalR 实现的校园二手交易平台。

```
├── api/              # .NET 后端（Clean Architecture）
└── miniprogram/      # 微信小程序前端
```

## 前置依赖

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Docker Desktop + WSL2（或 Linux 环境）
- 微信小程序 AppId（用于微信登录）

## 快速启动（推荐 — Docker Compose）

```bash
# 1. 配置微信凭证
cp .env.example .env
# 编辑 .env 填入 WECHAT_APPID / WECHAT_APPSECRET

# 2. 一键启动全部服务
docker compose up --build

# 3. 访问
# API:      http://localhost:8080/api/v1/...
# Swagger:  http://localhost:8080/swagger
```

## 本地开发（无 Docker）

```bash
# 1. 确保 MySQL + Redis 已启动

# 2. 应用数据库迁移
cd src
dotnet ef database update

# 3. 启动 API
cd WebAPI
ASPNETCORE_ENVIRONMENT=Development dotnet run

# 默认地址: http://localhost:5242
# Swagger:   http://localhost:5242/swagger
```

## 项目结构

```
src/
├── Domain/              # 领域实体、枚举、DTO（纯 C#）
├── Infrastructure/      # EF Core、Redis、邮件、定时任务
└── WebAPI/              # Controller、Middleware、Hub
```
