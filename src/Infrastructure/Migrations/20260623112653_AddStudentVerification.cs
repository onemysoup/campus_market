using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAUSecondHand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some dev databases already applied this table from an older migration id.
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `t_student_verification_application` (
    `Id` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
    `UserId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
    `RealName` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    `StudentId` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    `CertificateImageUrl` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
    `Status` int NOT NULL,
    `AdminId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
    `AdminNote` varchar(256) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `ReviewedAt` datetime(6) NULL,
    CONSTRAINT `PK_t_student_verification_application` PRIMARY KEY (`Id`),
    INDEX `IX_t_student_verification_application_Status` (`Status`),
    INDEX `IX_t_student_verification_application_UserId` (`UserId`)
) CHARACTER SET=utf8mb4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_student_verification_application");
        }
    }
}
