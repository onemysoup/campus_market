using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_blacklist",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    BlockedId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_blacklist", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_browse_history",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    BrowsedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_browse_history", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_chat_session",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserAId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserBId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LastMessageTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastMessagePreview = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_chat_session", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_credit_log",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ChangeAmount = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RelatedTransactionId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    AdminId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    ScoreAfter = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_credit_log", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_favorite",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_favorite", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_message",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SessionId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SenderId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ReceiverId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MsgType = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Timestamp = table.Column<long>(type: "bigint", nullable: false),
                    IsRead = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_message", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_report_log",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ReporterId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TargetId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    ReasonType = table.Column<int>(type: "int", nullable: false),
                    EvidenceImages = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    AdminNote = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_report_log", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_request",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    BuyerId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MaxPrice = table.Column<decimal>(type: "decimal(10,2)", precision: 18, scale: 2, nullable: true),
                    IsUrgent = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ResourceType = table.Column<int>(type: "int", nullable: false),
                    CampusArea = table.Column<int>(type: "int", nullable: false),
                    MatchingCount = table.Column<int>(type: "int", nullable: false),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_request", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_user",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Nickname = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EmailAddress = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentId = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AuthLevel = table.Column<int>(type: "int", nullable: false),
                    CampusArea = table.Column<int>(type: "int", nullable: true),
                    IsStaff = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreditScore = table.Column<int>(type: "int", nullable: false, defaultValue: 100),
                    IsBanned = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    SecurityPasswordHash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AvatarUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    WeChatOpenId = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RoleType = table.Column<int>(type: "int", nullable: false),
                    GraduationYear = table.Column<string>(type: "varchar(4)", maxLength: 4, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AuthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_user", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_item",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SellerId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Price = table.Column<decimal>(type: "decimal(10,2)", precision: 18, scale: 2, nullable: false),
                    IsNegotiable = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsRental = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    RentalRate = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Deposit = table.Column<decimal>(type: "decimal(10,2)", precision: 18, scale: 2, nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    ConditionLevel = table.Column<int>(type: "int", nullable: false),
                    CampusArea = table.Column<int>(type: "int", nullable: false),
                    DeliveryPoint = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Images = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ViewCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_item", x => x.Id);
                    table.ForeignKey(
                        name: "FK_t_item_t_user_SellerId",
                        column: x => x.SellerId,
                        principalTable: "t_user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "t_transaction",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    BuyerId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SellerId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    SecureToken = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RentalReturnCode = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TokenStatus = table.Column<int>(type: "int", nullable: false),
                    RentalStatus = table.Column<int>(type: "int", nullable: false),
                    ExpectedReturnTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AgreedLocation = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsCrossCampus = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TokenExpiredAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    FinishTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CancelReason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_transaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_t_transaction_t_item_ItemId",
                        column: x => x.ItemId,
                        principalTable: "t_item",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_t_blacklist_UserId_BlockedId",
                table: "t_blacklist",
                columns: new[] { "UserId", "BlockedId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_browse_history_UserId_BrowsedAt",
                table: "t_browse_history",
                columns: new[] { "UserId", "BrowsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_t_browse_history_UserId_ItemId",
                table: "t_browse_history",
                columns: new[] { "UserId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_chat_session_UserAId",
                table: "t_chat_session",
                column: "UserAId");

            migrationBuilder.CreateIndex(
                name: "IX_t_chat_session_UserBId",
                table: "t_chat_session",
                column: "UserBId");

            migrationBuilder.CreateIndex(
                name: "IX_t_credit_log_UserId_CreatedAt",
                table: "t_credit_log",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_t_favorite_UserId_ItemId",
                table: "t_favorite",
                columns: new[] { "UserId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_item_SellerId",
                table: "t_item",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_t_item_Status_CampusArea_CreatedAt",
                table: "t_item",
                columns: new[] { "Status", "CampusArea", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_t_message_ReceiverId",
                table: "t_message",
                column: "ReceiverId");

            migrationBuilder.CreateIndex(
                name: "IX_t_message_SenderId",
                table: "t_message",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_t_message_SessionId",
                table: "t_message",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_t_report_log_TargetId",
                table: "t_report_log",
                column: "TargetId");

            migrationBuilder.CreateIndex(
                name: "IX_t_request_BuyerId",
                table: "t_request",
                column: "BuyerId");

            migrationBuilder.CreateIndex(
                name: "IX_t_transaction_BuyerId",
                table: "t_transaction",
                column: "BuyerId");

            migrationBuilder.CreateIndex(
                name: "IX_t_transaction_ItemId",
                table: "t_transaction",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_t_transaction_SellerId",
                table: "t_transaction",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_t_user_EmailAddress",
                table: "t_user",
                column: "EmailAddress",
                unique: true,
                filter: "\"email_address\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_t_user_WeChatOpenId",
                table: "t_user",
                column: "WeChatOpenId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_blacklist");

            migrationBuilder.DropTable(
                name: "t_browse_history");

            migrationBuilder.DropTable(
                name: "t_chat_session");

            migrationBuilder.DropTable(
                name: "t_credit_log");

            migrationBuilder.DropTable(
                name: "t_favorite");

            migrationBuilder.DropTable(
                name: "t_message");

            migrationBuilder.DropTable(
                name: "t_report_log");

            migrationBuilder.DropTable(
                name: "t_request");

            migrationBuilder.DropTable(
                name: "t_transaction");

            migrationBuilder.DropTable(
                name: "t_item");

            migrationBuilder.DropTable(
                name: "t_user");
        }
    }
}
