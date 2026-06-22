using CAUSecondHand.Infrastructure.BackgroundJobs;
using CAUSecondHand.Infrastructure.Data;
using CAUSecondHand.Infrastructure.Services;
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
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AuthLevelL1", policy => policy.RequireClaim("authLevel", "1", "2"))
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
