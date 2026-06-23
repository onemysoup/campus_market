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

# Copy published files (owned by root)
COPY --from=build /app .

# Create uploads directory and make it writable by the non-root app user
RUN mkdir -p /app/wwwroot/uploads && chown $APP_UID /app/wwwroot/uploads

# Use the built-in non-root user (ASP.NET Core 8+ images include 'app' user)
USER $APP_UID

EXPOSE 8080

ENTRYPOINT ["dotnet", "CAUSecondHand.WebAPI.dll"]
