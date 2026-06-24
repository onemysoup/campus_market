using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260624060000_AddTrackingLogs")]
    public partial class AddTrackingLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 搜索日志（DDD 6.14）：支撑搜索关键词云与日聚合。
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_search_log` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `UserId` char(36) NULL,
    `Keyword` varchar(64) NOT NULL,
    `CampusArea` int NULL,
    `ResultCount` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_t_search_log` PRIMARY KEY (`Id`),
    INDEX `IX_t_search_log_CreatedAt_Keyword` (`CreatedAt`, `Keyword`),
    INDEX `IX_t_search_log_UserId_CreatedAt` (`UserId`, `CreatedAt`)
) CHARACTER SET=utf8mb4;");

            // 行为埋点（DDD 6.15）：支撑页面点击、日活跃、功能入口点击等统计。
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_event_log` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `UserId` char(36) NULL,
    `EventType` varchar(64) NOT NULL,
    `PageCode` varchar(64) NULL,
    `ItemId` char(36) NULL,
    `RequestId` char(36) NULL,
    `CampusArea` int NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_t_event_log` PRIMARY KEY (`Id`),
    INDEX `IX_t_event_log_EventType_CreatedAt` (`EventType`, `CreatedAt`),
    INDEX `IX_t_event_log_UserId_CreatedAt` (`UserId`, `CreatedAt`),
    INDEX `IX_t_event_log_ItemId` (`ItemId`)
) CHARACTER SET=utf8mb4;");

            // t_stats_daily 增加页面点击分布列（DDD 6.16 page_clicks）。
            // t_stats_daily 由 DailyEtlJob 以裸 SQL 维护、未映射为 EF 实体，故此处单独补列；
            // 由 __EFMigrationsHistory 保证仅执行一次，使用标准 ADD COLUMN（MySQL 8 不支持 IF NOT EXISTS）。
            migrationBuilder.Sql(
                "ALTER TABLE `t_stats_daily` ADD COLUMN `PageClicksJson` json NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "t_search_log");
            migrationBuilder.DropTable(name: "t_event_log");
            migrationBuilder.Sql("ALTER TABLE `t_stats_daily` DROP COLUMN `PageClicksJson`;");
        }
    }
}
