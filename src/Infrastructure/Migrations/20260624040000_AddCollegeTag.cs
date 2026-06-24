using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260624040000_AddCollegeTag")]
    public partial class AddCollegeTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 学院标签（DDD 5.3 college_tag）：商品表与求购帖表保持同一套学院标签，均可空。
            // 由 __EFMigrationsHistory 保证本迁移仅执行一次，故使用标准 ADD COLUMN（MySQL 8 不支持 ADD COLUMN IF NOT EXISTS）。
            migrationBuilder.AddColumn<int>(
                name: "TargetCollege",
                table: "t_item",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetCollege",
                table: "t_request",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "TargetCollege", table: "t_item");
            migrationBuilder.DropColumn(name: "TargetCollege", table: "t_request");
        }
    }
}
