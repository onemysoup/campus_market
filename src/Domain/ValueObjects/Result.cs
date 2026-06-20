namespace CAUSecondHand.Domain.ValueObjects;

public readonly record struct Result
{
    public bool IsSuccess { get; init; }
    public string? Error { get; init; }

    public static Result Success() => new() { IsSuccess = true };
    public static Result Failure(string error) => new() { IsSuccess = false, Error = error };

    public void Deconstruct(out bool isSuccess, out string? error)
    {
        isSuccess = IsSuccess;
        error = Error;
    }
}
