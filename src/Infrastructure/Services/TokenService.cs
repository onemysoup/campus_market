using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace CAUSecondHand.Infrastructure.Services;

public sealed class TokenService(string hmacKey)
{
    private const string PickupCodePrefix = "PU";
    private const string ReturnCodePrefix = "RT";
    private const string StoredTokenPrefix = "TX";

    public string GeneratePickupCode(Guid transactionId, Guid buyerId)
    {
        var data = $"{PickupCodePrefix}:{transactionId}:{buyerId}";
        var hash = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(hmacKey),
            Encoding.UTF8.GetBytes(data));
        var code = Math.Abs(BitConverter.ToInt32(hash, 0)) % 10000;
        return code.ToString("D4", CultureInfo.InvariantCulture);
    }

    public string GenerateReturnCode(Guid transactionId, Guid sellerId)
    {
        var data = $"{ReturnCodePrefix}:{transactionId}:{sellerId}";
        var hash = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(hmacKey),
            Encoding.UTF8.GetBytes(data));
        var code = Math.Abs(BitConverter.ToInt32(hash, 0)) % 10000;
        return $"R{code:D4}";
    }

    public string HashTransactionToken(Guid transactionId, string plainCode)
    {
        var data = $"{StoredTokenPrefix}:{transactionId}:{plainCode}";
        var hash = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(hmacKey),
            Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash);
    }

    public bool VerifyTransactionToken(Guid transactionId, string inputCode, string storedToken)
    {
        var expectedHash = HashTransactionToken(transactionId, inputCode);
        return VerifyToken(inputCode, storedToken) || VerifyToken(expectedHash, storedToken);
    }

    public static bool VerifyToken(string inputCode, string expectedCode) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(inputCode),
            Encoding.UTF8.GetBytes(expectedCode));
}
