using CAUSecondHand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260624080000_AddCrossCampusAndReview")]
    public partial class AddCrossCampusAndReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 跨区托带意向标签（F4.4.1）：商品级"支持东西校区互带"开关，默认 false。
            migrationBuilder.AddColumn<bool>(
                name: "SupportCrossCampus",
                table: "t_item",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            // 交易评价（SRS Could 评价系统-文字评分）。
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_transaction_review` (
    `Id` char(36) NOT NULL,
    `TransactionId` char(36) NOT NULL,
    `ReviewerId` char(36) NOT NULL,
    `RevieweeId` char(36) NOT NULL,
    `Rating` int NOT NULL,
    `Comment` varchar(256) NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_t_transaction_review` PRIMARY KEY (`Id`),
    UNIQUE INDEX `IX_t_transaction_review_TransactionId_ReviewerId` (`TransactionId`, `ReviewerId`),
    INDEX `IX_t_transaction_review_RevieweeId` (`RevieweeId`)
) CHARACTER SET=utf8mb4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "SupportCrossCampus", table: "t_item");
            migrationBuilder.DropTable(name: "t_transaction_review");
        }
    }
}
