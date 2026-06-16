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

## 后端项目结构

```
src/
├── Domain/              # 领域实体、枚举、DTO（纯 C#）
├── Infrastructure/      # EF Core、Redis、邮件、定时任务
└── WebAPI/              # Controller、Middleware、Hub
```
