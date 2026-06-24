# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore layer (cached as long as .csproj files don't change)
COPY Directory.Build.props .
COPY Domain/CAUSecondHand.Domain.csproj Domain/
COPY Infrastructure/CAUSecondHand.Infrastructure.csproj Infrastructure/
COPY WebAPI/CAUSecondHand.WebAPI.csproj WebAPI/
RUN dotnet restore WebAPI/CAUSecondHand.WebAPI.csproj

# Publish layer (invalidated on source changes)
COPY . .
RUN dotnet publish WebAPI/CAUSecondHand.WebAPI.csproj -c Release -o /app --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# 安装中文字体，供商品图片水印「CAU 二手交易专用」渲染（SRS 686）。
# 加 `|| true` 使字体源不可用时不阻断构建；缺字体时水印逻辑会自动跳过、不影响上传。
RUN (apt-get update && apt-get install -y --no-install-recommends fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*) || true

# Copy published files (owned by root)
COPY --from=build /app .

# Create uploads directory and make it writable by the non-root app user
RUN mkdir -p /app/wwwroot/uploads && chown $APP_UID /app/wwwroot/uploads

# Use the built-in non-root user (ASP.NET Core 8+ images include 'app' user)
USER $APP_UID

EXPOSE 8080

ENTRYPOINT ["dotnet", "CAUSecondHand.WebAPI.dll"]
