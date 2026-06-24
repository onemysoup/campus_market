using CAUSecondHand.Domain.Entities;
using CAUSecondHand.Domain.Enums;
using CAUSecondHand.Infrastructure.BackgroundJobs;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
using CAUSecondHand.WebAPI.Helpers;
using CAUSecondHand.WebAPI.Middleware;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Quartz;
using Serilog;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// Services
var connectionString = builder.Configuration.GetConnectionString("Default")!;
var serverVersion = ServerVersion.AutoDetect(connectionString);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, serverVersion,
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration.GetSection("Jwt");
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwt["Key"]!))
        };

        // Allow SignalR to receive JWT from query string (WebSocket limitation)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            // 每次请求校验用户是否被封禁，使被封禁用户手中的旧 token 立即失效
            OnTokenValidated = async context =>
            {
                var userIdClaim = context.Principal?.FindFirst(
                    System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdClaim, out var userId))
                {
                    var db = context.HttpContext.RequestServices
                        .GetRequiredService<AppDbContext>();
                    var isBanned = await db.Users
                        .Where(u => u.Id == userId)
                        .Select(u => (bool?)u.IsBanned)
                        .FirstOrDefaultAsync();
                    if (isBanned is null)
                        context.Fail("用户不存在");
                    else if (isBanned.Value)
                        context.Fail("账号已被封禁");
                }
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AuthLevelL1", policy => policy.RequireClaim("authLevel", "1", "2"))
    .AddPolicy("AuthLevelL2", policy => policy.RequireClaim("authLevel", "2"))
    .AddPolicy("AdminOnly", policy => policy.RequireClaim("roleType", "Admin"));

builder.Services.AddSignalR();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("Fixed", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddMemoryCache();
builder.Services.AddProblemDetails();

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Infrastructure services
builder.Services.AddSingleton(new TokenService(
    builder.Configuration.GetSection("Token")["HmacKey"] ?? ""));
builder.Services.AddSingleton<IEmailSender, EmailSender>();
builder.Services.Configure<SmtpOptions>(
    builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.AddHttpClient<IWeChatApiClient, WeChatApiClient>();
builder.Services.Configure<WeChatOptions>(
    builder.Configuration.GetSection(WeChatOptions.SectionName));
builder.Services.AddHttpClient<IAiDescriptionGenerator, AiDescriptionService>();
builder.Services.Configure<AiOptions>(
    builder.Configuration.GetSection(AiOptions.SectionName));

builder.Services.AddQuartz(options =>
{
    options.AddJob<ExpiredItemJob>(j => j.WithIdentity("ExpiredItemJob"))
        .AddTrigger(t => t.ForJob("ExpiredItemJob")
            .WithCronSchedule("0 0 2 * * ?"));

    options.AddJob<GraduationDegradationJob>(j => j.WithIdentity("GraduationDegradationJob"))
        .AddTrigger(t => t.ForJob("GraduationDegradationJob")
            .WithCronSchedule("0 0 0 1 7 ?"));

    options.AddJob<DailyEtlJob>(j => j.WithIdentity("DailyEtlJob"))
        .AddTrigger(t => t.ForJob("DailyEtlJob")
            .WithCronSchedule("0 0 1 * * ?"));

    // 防鸽子：每小时检查超 24h 未核销的交易，自动释放商品
    options.AddJob<AntiGhostJob>(j => j.WithIdentity("AntiGhostJob"))
        .AddTrigger(t => t.ForJob("AntiGhostJob")
            .WithCronSchedule("0 0 * * * ?"));
});
builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

builder.Services.AddControllers();
builder.Services.AddOpenApiDocument(options =>
    options.Title = "CAUSecondHand API");

var app = builder.Build();

// Auto-apply pending EF Core migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CAUSecondHand.Infrastructure.Data.AppDbContext>();
    await db.Database.MigrateAsync();

    // Seed demo users on first run
    if (!await db.Users.AnyAsync())
    {
        var admin = new User("admin-openid", "管理员");
        admin.SetPassword(PasswordHelper.Hash("123456"));
        admin.VerifyEmail("admin@cau.edu.cn");
        admin.SetCampusArea(CampusArea.East);
        admin.PromoteToAdmin();

        var user1 = new User("demo1-openid", "演示用户一");
        user1.SetPassword(PasswordHelper.Hash("123456"));
        user1.VerifyEmail("demo1@cau.edu.cn");
        user1.SetCampusArea(CampusArea.East);

        var user2 = new User("demo2-openid", "演示用户二");
        user2.SetPassword(PasswordHelper.Hash("123456"));
        user2.VerifyEmail("demo2@cau.edu.cn");
        user2.SetCampusArea(CampusArea.West);

        db.Users.AddRange(admin, user1, user2);
        await db.SaveChangesAsync();
    }
}

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<CAUSecondHand.WebAPI.Hubs.ChatHub>("/hubs/chat");

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.Run();
