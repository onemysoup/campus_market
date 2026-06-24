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
builder.Services.AddHttpClient<IAiContentModerator, AiContentModerationService>();
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

    async Task EnsureDemoUserAsync(
        string email,
        string openId,
        string nickname,
        CampusArea campusArea,
        bool isAdmin = false,
        string? studentId = null)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.EmailAddress == email)
            ?? await db.Users.FirstOrDefaultAsync(u => u.WeChatOpenId == openId);

        if (user is null)
        {
            user = new User(openId, nickname);
            db.Users.Add(user);
        }

        user.UpdateProfile(nickname, user.AvatarUrl);
        user.SetPassword(PasswordHelper.Hash("123456"));
        user.VerifyEmail(email);
        user.SetCampusArea(campusArea);
        user.Unban();

        if (!string.IsNullOrWhiteSpace(studentId))
        {
            var duplicateStudentId = await db.Users
                .AnyAsync(u => u.Id != user.Id && u.StudentId == studentId);
            if (!duplicateStudentId)
                user.VerifyStudent(studentId);
        }

        if (isAdmin)
            user.PromoteToAdmin();
    }

    await EnsureDemoUserAsync("admin@cau.edu.cn", "admin-openid", "管理员", CampusArea.East, isAdmin: true);
    await EnsureDemoUserAsync("demo1@cau.edu.cn", "demo1-openid", "普通用户A", CampusArea.East,
        studentId: "202300000001");
    await EnsureDemoUserAsync("demo2@cau.edu.cn", "demo2-openid", "普通用户B", CampusArea.West,
        studentId: "202300000002");
    await EnsureDemoUserAsync("l1user@cau.edu.cn", "l1user-openid", "L1备用用户", CampusArea.East);

    var activeItems = await db.Items
        .Where(i => i.Status == ItemStatus.Active)
        .ToListAsync();
    foreach (var item in activeItems)
    {
        if (ContentFilter.FindBanned(item.Title, item.Description) is not null)
            item.TransitionTo(ItemStatus.Inactive);
    }

    await db.SaveChangesAsync();
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
