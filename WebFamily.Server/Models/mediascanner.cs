using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public class MediaOptions
{
    public string Root { get; set; } = @"D:\medias";
    public string ReviewFolder { get; set; } = @"D:\medias_review"; // must be OUTSIDE Root
    public List<string> ExcludeFolders { get; set; } = new();        // e.g. the _Trash folder under Root
}

public record ScanResult(int Seen, int Added, int Missing, int Hashed);

public class MediaScanner
{
    public static readonly HashSet<string> PhotoExt = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tif", ".tiff", ".heic" };

    private readonly WebFamilyDbContext _db;
    private readonly MediaOptions _opt;

    public MediaScanner(WebFamilyDbContext db, IOptions<MediaOptions> opt) { _db = db; _opt = opt.Value; }

    public async Task<ScanResult> ScanAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_opt.Root))
            throw new DirectoryNotFoundException($"Media root not found: {_opt.Root}");

        var now = DateTime.UtcNow;
        // include quarantined rows too: FullPath is unique, so a restored file must reuse its row
        var existing = await _db.MediaFiles
            .ToDictionaryAsync(f => f.FullPath, StringComparer.OrdinalIgnoreCase, ct);

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int added = 0;

        var enumOpt = new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = true };
        foreach (var path in Directory.EnumerateFiles(_opt.Root, "*", enumOpt))
        {
            ct.ThrowIfCancellationRequested();
            if (path.Length > 450) continue; // column limit
            if (_opt.ExcludeFolders.Any(x => !string.IsNullOrWhiteSpace(x) &&
                    path.StartsWith(x.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase))) continue;
            var info = new FileInfo(path);
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
            row.IsPhoto = PhotoExt.Contains(info.Extension);
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
        var dupSizes = _db.MediaFiles
            .Where(f => f.Status == EnuMediaFileStatus.Active && f.SizeBytes > 0)
            .GroupBy(f => f.SizeBytes).Where(g => g.Count() > 1).Select(g => g.Key);

        var todo = await _db.MediaFiles
            .Where(f => f.Status == EnuMediaFileStatus.Active && f.Sha256 == null && dupSizes.Contains(f.SizeBytes))
            .ToListAsync(ct);

        int n = 0;
        foreach (var f in todo)
        {
            try
            {
                await using var fs = new FileStream(f.FullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true);
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

    /// Moves the file into the review folder (keeping its relative path) and updates the DB.
    public async Task<string> QuarantineAsync(long id, string? user)
    {
        var f = await _db.MediaFiles.FirstOrDefaultAsync(x => x.Id == id && x.Status == EnuMediaFileStatus.Active)
                ?? throw new InvalidOperationException("File not found or not active.");
        if (!File.Exists(f.FullPath)) { f.Status = EnuMediaFileStatus.Missing; await _db.SaveChangesAsync(); throw new FileNotFoundException("File no longer exists on disk."); }

        var rel = Path.GetRelativePath(_opt.Root, f.FullPath);
        var dest = Path.Combine(_opt.ReviewFolder, rel);
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

    public string Root => _opt.Root;
}
