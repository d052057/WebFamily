namespace WebFamily.Server.Services;

/// <summary>What the Angular page polls while a scan is running.</summary>
public record ScanStatus(
    bool Running,
    string Phase,          // Idle | Starting | Scanning files | Hashing | Done | Cancelled | Failed
    int FilesSeen,
    int HashDone,
    int HashTotal,
    DateTime? StartedUtc,
    DateTime? FinishedUtc,
    string? Message,
    string? Error);

/// <summary>
/// Runs MediaScanner in the background so a scan of a multi-TB drive is not tied to one HTTP request
/// (which times out after a couple of minutes). Register as a singleton:
///     services.AddSingleton&lt;MediaScanJob&gt;();
/// Only one scan runs at a time. Progress is saved to the database as it goes, so a cancelled,
/// failed, or restarted scan continues from where it stopped on the next run.
/// </summary>
public class MediaScanJob
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<MediaScanJob> _log;
    private readonly object _lock = new();
    private CancellationTokenSource? _cts;
    private ScanStatus _status = new(false, "Idle", 0, 0, 0, null, null, null, null);

    public MediaScanJob(IServiceScopeFactory scopes, ILogger<MediaScanJob> log)
    {
        _scopes = scopes;
        _log = log;
    }

    public ScanStatus Status { get { lock (_lock) return _status; } }

    /// <summary>Starts a scan; returns false if one is already running.</summary>
    public bool TryStart()
    {
        CancellationToken ct;
        lock (_lock)
        {
            if (_status.Running) return false;
            _cts?.Dispose();
            _cts = new CancellationTokenSource();
            ct = _cts.Token;
            _status = new ScanStatus(true, "Starting", 0, 0, 0, DateTime.UtcNow, null, null, null);
        }
        _ = Task.Run(() => RunAsync(ct));   // not awaited on purpose: the request returns immediately
        return true;
    }

    public void Cancel()
    {
        lock (_lock) _cts?.Cancel();
    }

    private void Update(Func<ScanStatus, ScanStatus> change)
    {
        lock (_lock) _status = change(_status);
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            // the scan needs its own scope/DbContext: the request that started it ends immediately
            using var scope = _scopes.CreateScope();
            var scanner = scope.ServiceProvider.GetRequiredService<MediaScanner>();

            var result = await scanner.ScanAsync(
                p => Update(s => s with { Phase = p.Phase, FilesSeen = p.FilesSeen, HashDone = p.HashDone, HashTotal = p.HashTotal }),
                ct);

            Update(s => s with
            {
                Running = false,
                Phase = "Done",
                FinishedUtc = DateTime.UtcNow,
                Message = $"Scan done: {result.Seen:N0} files, {result.Added:N0} new, {result.Missing:N0} missing, {result.Hashed:N0} hashed."
            });
        }
        catch (OperationCanceledException)
        {
            Update(s => s with
            {
                Running = false,
                Phase = "Cancelled",
                FinishedUtc = DateTime.UtcNow,
                Message = "Scan cancelled. Hashes already computed are saved; run it again to continue."
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Media scan failed");
            Update(s => s with
            {
                Running = false,
                Phase = "Failed",
                FinishedUtc = DateTime.UtcNow,
                Error = ex.GetBaseException().Message
            });
        }
    }
}
