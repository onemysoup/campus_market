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

# Use the built-in non-root user (ASP.NET Core 8+ images include 'app' user)
USER $APP_UID

COPY --from=build --chown=$APP_UID /app .

EXPOSE 8080

ENTRYPOINT ["dotnet", "CAUSecondHand.WebAPI.dll"]
