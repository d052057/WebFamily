using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public interface IMediaFolderScanService
{
    /// <summary>
    /// Recursively scans rootPath and populates MediaFolder/MediaTrack under
    /// the given menu. Each immediate sub-folder of rootPath becomes a
    /// top-level MediaFolder (e.g. an artist); anything nested under that
    /// becomes a child folder (album, disc, ...), to any depth.
    /// </summary>
    Task<List<string>> ScanAsync(string menu, string rootPath);
}

public class MediaFolderScanService : IMediaFolderScanService
{
    // Allowlist: only these are ever turned into MediaTrack rows. Anything else
    // found in a music folder (cover art, .nfo, playlists, Thumbs.db, ...) is
    // simply skipped rather than needing to be named on a junk-file blocklist.
    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".wma", ".aiff"
    };

    // A stray image directly in a folder is very often intentional cover art,
    // not junk - the first name+extension combo found here is captured.
    private static readonly string[] CoverFileBaseNames = { "cover", "folder", "album" };
    private static readonly string[] CoverExtensions = { ".jpg", ".jpeg", ".png" };

    // Common placeholder values some taggers/rippers write instead of leaving
    // a field blank. Treated as "no value" rather than stored literally.
    private static readonly HashSet<string> PlaceholderTagValues = new(StringComparer.OrdinalIgnoreCase)
    {
        "<unknown>", "unknown", "unknown artist", "unknown album"
    };

    private readonly WebFamilyDbContext _context;
    private readonly MimeType _mimeType = new();
    private readonly ILogger<MediaFolderScanService>? _logger;

    public MediaFolderScanService(WebFamilyDbContext context, ILogger<MediaFolderScanService>? logger = null)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<string>> ScanAsync(string menu, string rootPath)
    {
        var results = new List<string>();

        if (!Directory.Exists(rootPath))
        {
            results.Add($"Directory not found: {rootPath}");
            return results;
        }

        var menuRecord = await _context.MediaMenus.SingleOrDefaultAsync(m => m.Menu == "musics");
        if (menuRecord is null)
        {
            results.Add($"Menu not found: {menu}. Create the MediaMenu row first.");
            return results;
        }

        foreach (var topLevelDir in Directory.GetDirectories(rootPath))
        {
            await ScanDirectoryAsync(topLevelDir, menuRecord.RecordId, parentFolderId: null, results);
        }

        await _context.SaveChangesAsync();
        results.Add("Scan complete");
        return results;
    }

    private async Task<Guid> ScanDirectoryAsync(string physicalPath, Guid menuId, Guid? parentFolderId, List<string> results)
    {
        var name = Path.GetFileName(physicalPath.TrimEnd(Path.DirectorySeparatorChar));

        var folder = await _context.MediaFolders.SingleOrDefaultAsync(f =>
            f.MenuId == menuId && f.ParentFolderId == parentFolderId && f.Name == name);

        if (folder is null)
        {
            folder = new MediaFolder
            {
                RecordId = Guid.NewGuid(),
                MenuId = menuId,
                ParentFolderId = parentFolderId,
                Name = name
            };
            _context.MediaFolders.Add(folder);
        }

        // Cover art directly in this folder, if any.
        var coverFile = CoverFileBaseNames
            .SelectMany(baseName => CoverExtensions.Select(ext => baseName + ext))
            .Select(candidate => Path.Combine(physicalPath, candidate))
            .FirstOrDefault(System.IO.File.Exists);
        folder.CoverImagePath = coverFile is null ? null : Path.GetFileName(coverFile);

        // Audio files directly in this folder - allowlist, not blocklist.
        var audioFiles = Directory.GetFiles(physicalPath)
            .Where(f => AudioExtensions.Contains(Path.GetExtension(f)))
            .ToList();

        var seenFileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var filePath in audioFiles)
        {
            var fileName = Path.GetFileName(filePath);
            seenFileNames.Add(fileName);
            await UpsertTrackAsync(folder.RecordId, filePath, fileName);
        }

        // Remove tracks for files that no longer exist here (renamed/deleted since last scan).
        var existingTracks = await _context.MediaTracks
            .Where(t => t.FolderId == folder.RecordId)
            .ToListAsync();
        _context.MediaTracks.RemoveRange(existingTracks.Where(t => !seenFileNames.Contains(t.FileName)));

        results.Add($"{name}: {audioFiles.Count} audio file(s)");

        foreach (var subDirectory in Directory.GetDirectories(physicalPath))
        {
            await ScanDirectoryAsync(subDirectory, menuId, folder.RecordId, results);
        }

        return folder.RecordId;
    }

    private async Task UpsertTrackAsync(Guid folderId, string filePath, string fileName)
    {
        var track = await _context.MediaTracks.SingleOrDefaultAsync(t =>
            t.FolderId == folderId && t.FileName == fileName);

        if (track is null)
        {
            track = new MediaTrack
            {
                RecordId = Guid.NewGuid(),
                FolderId = folderId,
                FileName = fileName
            };
            _context.MediaTracks.Add(track);
        }

        track.Type = _mimeType.Get(filePath);

        try
        {
            using var tagFile = TagLib.File.Create(filePath);
            var tag = tagFile.Tag;

            track.Title = CleanTag(tag?.Title);
            track.Artist = CleanTag(tag?.FirstPerformer) ?? CleanTag(tag?.FirstAlbumArtist);
            track.Album = CleanTag(tag?.Album);
            track.Genre = CleanTag(tag?.FirstGenre);
            track.TrackNumber = tag?.Track > 0 ? (int)tag.Track : null;
            track.Year = tag?.Year > 0 ? (int)tag.Year : null;

            track.Duration = tagFile.Properties is { Duration.TotalSeconds: > 0 } props
                ? props.Duration.ToString(@"hh\:mm\:ss")
                : null;
        }
        catch (Exception ex)
        {
            // Missing/corrupt tag: keep the row - fileName alone is still
            // enough to display and play the track, just without tag data.
            _logger?.LogWarning(ex, "Could not read tags for {FilePath}", filePath);
        }
    }

    private static string? CleanTag(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return PlaceholderTagValues.Contains(trimmed) ? null : trimmed;
    }
}
