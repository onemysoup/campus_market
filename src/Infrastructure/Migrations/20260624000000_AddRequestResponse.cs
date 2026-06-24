using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestResponse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 求购响应表 t_request_response（DDD 6.6）。使用 IF NOT EXISTS 兼容已手工建表的开发库。
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_request_response` (
    `Id` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
    `RequestId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
    `SellerId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
    `ItemId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
    `Message` varchar(256) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_t_request_response` PRIMARY KEY (`Id`),
    UNIQUE INDEX `IX_t_request_response_RequestId_SellerId_ItemId` (`RequestId`, `SellerId`, `ItemId`),
    INDEX `IX_t_request_response_SellerId` (`SellerId`)
) CHARACTER SET=utf8mb4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_request_response");
        }
    }
}
