using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public record ScanResult(int Seen, int Added, int Missing, int Hashed);

/// <summary>
/// Inventories MediaDrive into MediaFiles and hashes same-size files.
/// Every setting comes from appsettings.json -> ApplicationSettings
/// (MediaDrive, ReviewFolder, TrashFolder, MediaScanExtensions, DuplicateScan).
/// </summary>
public class MediaScanner
{
    private readonly WebFamilyDbContext _db;
    private readonly ApplicationSettings _app;
    private readonly DuplicateScanSettings _cfg;
    private readonly HashSet<string> _photoExt;     // files that get the View button
    private readonly HashSet<string>? _scanExt;     // null = scan every file
    private readonly List<string> _excluded;        // folders under MediaDrive that are never scanned

    public MediaScanner(WebFamilyDbContext db, IOptions<ApplicationSettings> options)
    {
        _db = db;
        _app = options.Value;
        _cfg = _app.DuplicateScan;

        var ext = _app.MediaScanExtensions;
        _photoExt = ToSet(ext.Photo);

        var wanted = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var type in _cfg.ScanTypes ?? new())
            foreach (var e in type.Trim().ToLowerInvariant() switch
            {
                "photo" => ext.Photo,
                "video" => ext.Video,
                "audio" => ext.Audio,
                "book" => ext.Book,
                _ => new List<string>()
            })
                wanted.Add(e);
        _scanExt = wanted.Count == 0 ? null : ToSet(wanted);

        // Trash lives under MediaDrive; never treat its files (or the review folder) as duplicates.
        _excluded = new[] { _app.TrashFolder, _app.ReviewFolder }
            .Where(f => !string.IsNullOrWhiteSpace(f))
            .Select(f => f.TrimEnd('\\', '/') + Path.DirectorySeparatorChar)
            .ToList();
    }

    public string Root => _app.MediaDrive;

    private static HashSet<string> ToSet(IEnumerable<string> items) =>
        new(items.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()), StringComparer.OrdinalIgnoreCase);

    public async Task<ScanResult> ScanAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(Root))
            throw new DirectoryNotFoundException($"Media root not found: {Root}");

        var now = DateTime.UtcNow;
        // include quarantined rows too: FullPath is unique, so a restored file must reuse its row
        var existing = await _db.MediaFiles
            .ToDictionaryAsync(f => f.FullPath, StringComparer.OrdinalIgnoreCase, ct);

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int added = 0;

        var enumOpt = new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = true };
        foreach (var path in Directory.EnumerateFiles(Root, "*", enumOpt))
        {
            ct.ThrowIfCancellationRequested();
            if (path.Length > _cfg.MaxPathLength) continue;
            if (_excluded.Any(x => path.StartsWith(x, StringComparison.OrdinalIgnoreCase))) continue;

            var info = new FileInfo(path);
            if (_scanExt != null && !_scanExt.Contains(info.Extension)) continue;
            if (info.Length < _cfg.MinFileSizeBytes) continue;
            seen.Add(path);

            if (!existing.TryGetValue(path, out var row))
            {
                row = new MediaFileRecord { FullPath = path };
                _db.MediaFiles.Add(row);
                added++;
            }
            var lw = info.LastWriteTimeUtc;
            if (row.SizeBytes != info.Length || row.LastWriteUtc != lw) row.Sha256 = null; // content changed

            row.FileName = info.Name;
            row.Extension = info.Extension;
            row.SizeBytes = info.Length;
            row.LastWriteUtc = lw;
            row.IsPhoto = _photoExt.Contains(info.Extension);
            row.Status = EnuMediaFileStatus.Active;
            row.QuarantinePath = null;
            row.ScannedUtc = now;
        }

        int missing = 0;
        foreach (var (p, row) in existing)
            if (!seen.Contains(p) && row.Status == EnuMediaFileStatus.Active) { row.Status = EnuMediaFileStatus.Missing; missing++; }

        await _db.SaveChangesAsync(ct);
        int hashed = await HashDuplicateSizesAsync(ct);
        return new ScanResult(seen.Count, added, missing, hashed);
    }

    /// Hash (SHA-256) every active file, photo or not, that shares its size with another file.
    private async Task<int> HashDuplicateSizesAsync(CancellationToken ct)
    {
        var minSize = _cfg.MinFileSizeBytes;
        var dupSizes = _db.MediaFiles
            .Where(f => f.Status == EnuMediaFileStatus.Active && f.SizeBytes >= minSize)
            .GroupBy(f => f.SizeBytes).Where(g => g.Count() > 1).Select(g => g.Key);

        var todo = await _db.MediaFiles
            .Where(f => f.Status == EnuMediaFileStatus.Active && f.Sha256 == null && dupSizes.Contains(f.SizeBytes))
            .ToListAsync(ct);

        int n = 0;
        foreach (var f in todo)
        {
            try
            {
                await using var fs = new FileStream(f.FullPath, FileMode.Open, FileAccess.Read, FileShare.Read, _cfg.HashBufferBytes, true);
                f.Sha256 = Convert.ToHexString(await SHA256.HashDataAsync(fs, ct)).ToLowerInvariant();
                n++;
                if (n % 50 == 0) await _db.SaveChangesAsync(ct);
            }
            catch (IOException) { /* locked: try next scan */ }
            catch (UnauthorizedAccessException) { }
        }
        await _db.SaveChangesAsync(ct);
        return n;
    }

    /// Moves the file into ReviewFolder (keeping its relative path) and updates the DB.
    public async Task<string> QuarantineAsync(long id, string? user)
    {
        var f = await _db.MediaFiles.FirstOrDefaultAsync(x => x.Id == id && x.Status == EnuMediaFileStatus.Active)
                ?? throw new InvalidOperationException("File not found or not active.");
        if (!File.Exists(f.FullPath))
        {
            f.Status = EnuMediaFileStatus.Missing;
            await _db.SaveChangesAsync();
            throw new FileNotFoundException("File no longer exists on disk.");
        }

        var rel = Path.GetRelativePath(Root, f.FullPath);
        var dest = Path.Combine(_app.ReviewFolder, rel);
        Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
        if (File.Exists(dest))
            dest = Path.Combine(Path.GetDirectoryName(dest)!,
                   $"{Path.GetFileNameWithoutExtension(dest)}_{f.Id}{Path.GetExtension(dest)}");

        File.Move(f.FullPath, dest);
        try
        {
            _db.MediaFileActions.Add(new MediaFileAction
            {
                MediaFileId = f.Id,
                Action = "Quarantined",
                FromPath = f.FullPath,
                ToPath = dest,
                PerformedBy = user,
                PerformedUtc = DateTime.UtcNow
            });
            f.Status = EnuMediaFileStatus.Quarantined;
            f.QuarantinePath = dest;
            await _db.SaveChangesAsync();
        }
        catch { File.Move(dest, f.FullPath); throw; } // keep disk and DB consistent
        return dest;
    }
}
