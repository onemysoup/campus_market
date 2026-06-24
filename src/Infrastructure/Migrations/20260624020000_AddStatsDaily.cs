using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260624020000_AddStatsDaily")]
    public partial class AddStatsDaily : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_stats_daily` (
    `StatDate` date NOT NULL,
    `CampusArea` int NOT NULL,
    `TotalPublished` int NOT NULL DEFAULT 0,
    `TotalTurnover` int NOT NULL DEFAULT 0,
    `ActiveUsers` int NOT NULL DEFAULT 0,
    `NewUsers` int NOT NULL DEFAULT 0,
    `CategoryBreakdownJson` json NULL,
    `SearchKeywordsJson` json NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_t_stats_daily` PRIMARY KEY (`StatDate`, `CampusArea`)
) CHARACTER SET=utf8mb4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_stats_daily");
        }
    }
}
