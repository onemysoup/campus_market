FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore with project files first (layer caching)
COPY Directory.Build.props .
COPY Domain/CAUSecondHand.Domain.csproj Domain/
COPY Infrastructure/CAUSecondHand.Infrastructure.csproj Infrastructure/
COPY WebAPI/CAUSecondHand.WebAPI.csproj WebAPI/
RUN dotnet restore WebAPI/CAUSecondHand.WebAPI.csproj

# Build
COPY . .
RUN dotnet publish WebAPI/CAUSecondHand.WebAPI.csproj -c Release -o /app --no-restore

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

EXPOSE 8080

ENTRYPOINT ["dotnet", "CAUSecondHand.WebAPI.dll"]
