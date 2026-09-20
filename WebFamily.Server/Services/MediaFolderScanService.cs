using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

/// <summary>
/// One physical location to scan for a menu. Its immediate contents are
/// evaluated by shape (see MediaFolderScanService) to find the real end-items
/// (artists) underneath, however many pass-through/category folders sit
/// above them.
/// </summary>
/// <param name="PhysicalPath">Disk path to walk.</param>
/// <param name="UrlPrefix">URL-facing prefix (forward slashes) for files found under this root.</param>
public record ScanRoot(string PhysicalPath, string UrlPrefix);

public interface IMediaFolderScanService
{
    /// <summary>
    /// Recursively scans every given root and populates MediaFolder/MediaTrack
    /// under the given menu, merging all roots into one tree. Which folders
    /// become end-items (top-level MediaFolder rows) is decided purely by
    /// shape, not by name - see MediaFolderScanService.ScanForEndItemsAsync.
    /// </summary>
    Task<List<string>> ScanAsync(string menu, IReadOnlyList<ScanRoot> roots);
}

public class MediaFolderScanService : IMediaFolderScanService
{
    // Allowlist: only these are ever turned into MediaTrack rows. Anything else
    // found in a media folder (cover art, .nfo, playlists, Thumbs.db, ...) is
    // simply skipped rather than needing to be named on a junk-file blocklist.
    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".wma", ".aiff"
    };

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".mkv", ".mov", ".avi", ".wmv", ".m4v", ".webm", ".flv", ".mpg", ".mpeg", ".3gp"
    };

    private static readonly HashSet<string> PlayableExtensions =
        new(AudioExtensions.Union(VideoExtensions), StringComparer.OrdinalIgnoreCase);

    // Folders that belong to a different, already-existing app feature
    // entirely (rpm has its own dedicated tables/UI) - skipped outright,
    // before shape-detection ever looks at them. Everything else is still
    // classified purely by shape, no other names hardcoded anywhere.
    private static readonly HashSet<string> ExcludedFolderNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "rpm"
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

    public async Task<List<string>> ScanAsync(string menu, IReadOnlyList<ScanRoot> roots)
    {
        var results = new List<string>();

        if (roots.Count == 0)
        {
            results.Add($"No configured root folders for menu '{menu}'.");
            return results;
        }

        var menuRecord = await _context.MediaMenus.SingleOrDefaultAsync(m => m.Menu == menu);
        if (menuRecord is null)
        {
            results.Add($"Menu not found: {menu}. Create the MediaMenu row first.");
            return results;
        }

        // Wipe everything under this menu first, across ALL its roots. A
        // partial upsert can't tell the difference between "this artist was
        // renamed" and "this artist was deleted" - it just leaves the old row
        // behind either way. A full rebuild avoids that entirely: whatever's
        // on disk right now, across every configured root, is exactly what
        // ends up in the tables. MediaTrack rows cascade-delete automatically
        // via the FK to MediaFolder.
        var existingFolders = await _context.MediaFolders
            .Where(f => f.MenuId == menuRecord.RecordId)
            .ToListAsync();
        _context.MediaFolders.RemoveRange(existingFolders);
        await _context.SaveChangesAsync();
        results.Add($"Cleared {existingFolders.Count} existing folder(s) for '{menu}'");

        foreach (var root in roots)
        {
            if (!Directory.Exists(root.PhysicalPath))
            {
                results.Add($"Directory not found: {root.PhysicalPath}");
                continue;
            }

            await ScanForEndItemsAsync(root.PhysicalPath, menuRecord.RecordId, parentFolderId: null, root.UrlPrefix, results);
        }

        await _context.SaveChangesAsync();
        results.Add("Scan complete");
        return results;
    }

    /// <summary>
    /// Decides, purely by shape, whether physicalPath is a real end-item
    /// (an artist) or a pass-through folder that should be looked straight
    /// through:
    ///   - Has playable (audio or video) files directly inside?  -> it IS an
    ///     end-item, full stop, no matter what else it contains. Whatever's
    ///     nested inside (one album, several, discs, ...) is just its own
    ///     content from here on.
    ///   - No playable files, one or more sub-folders? -> pure pass-through
    ///     (a wrapper with exactly one collection inside, or a category with
    ///     many artists inside - doesn't matter which). Never becomes an
    ///     end-item itself; each sub-folder is evaluated the same way, and
    ///     whatever real end-items are found underneath attach directly to
    ///     parentFolderId, as if this folder were never there.
    ///   - No playable files, no sub-folders? -> empty, nothing to do.
    /// This is why AmericanMusics (many artist sub-folders) and a "Songs"
    /// wrapper (exactly one sub-folder) both work with no special-casing by
    /// name anywhere - the shape alone tells them apart from a real artist.
    /// </summary>
    private async Task ScanForEndItemsAsync(string physicalPath, Guid menuId, Guid? parentFolderId, string? rootUrlPrefix, List<string> results)
    {
        var name = Path.GetFileName(physicalPath.TrimEnd(Path.DirectorySeparatorChar));
        if (ExcludedFolderNames.Contains(name))
        {
            results.Add($"{name}: skipped (belongs to a different feature)");
            return;
        }

        var playableFiles = Directory.GetFiles(physicalPath)
            .Where(f => PlayableExtensions.Contains(Path.GetExtension(f)))
            .ToList();

        if (playableFiles.Count > 0)
        {
            await ScanFolderAsync(physicalPath, menuId, parentFolderId, rootUrlPrefix, results);
            return;
        }

        var subDirectories = Directory.GetDirectories(physicalPath);
        if (subDirectories.Length == 0)
        {
            results.Add($"{Path.GetFileName(physicalPath.TrimEnd(Path.DirectorySeparatorChar))}: empty, skipped");
            return;
        }

        foreach (var sub in subDirectories)
        {
            await ScanForEndItemsAsync(sub, menuId, parentFolderId, rootUrlPrefix, results);
        }
    }

    /// <summary>
    /// Once a folder is confirmed as a real end-item (or once we're already
    /// inside a confirmed one), this is a plain, unconditional recursive walk:
    /// every folder becomes a MediaFolder row, every audio file becomes a
    /// MediaTrack row. No more shape-checking below this point - an artist's
    /// own album/disc structure is real structure, not something to peel
    /// through.
    /// </summary>
    private async Task<Guid> ScanFolderAsync(string physicalPath, Guid menuId, Guid? parentFolderId, string? rootUrlPrefix, List<string> results)
    {
        var name = Path.GetFileName(physicalPath.TrimEnd(Path.DirectorySeparatorChar));

        // No lookup needed - everything under this menu was just cleared,
        // so every folder here is a fresh insert. RootPath is only meaningful
        // on top-level rows (parentFolderId is null) - it's how the tree
        // service knows which physical root a given top-level folder (and
        // everything nested under it) came from.
        var folder = new MediaFolder
        {
            RecordId = Guid.NewGuid(),
            MenuId = menuId,
            ParentFolderId = parentFolderId,
            Name = name,
            RootPath = parentFolderId is null ? rootUrlPrefix : null
        };
        _context.MediaFolders.Add(folder);

        // All files in this folder, enumerated once - both cover art and
        // audio tracks are picked out of this single list. Over a network
        // share, one enumeration beats 9 separate File.Exists() round trips
        // per folder (cover-art name/extension combos) at any real scale.
        var allFiles = Directory.GetFiles(physicalPath);

        var coverFile = CoverFileBaseNames
            .SelectMany(baseName => CoverExtensions.Select(ext => baseName + ext))
            .Select(candidate => Path.Combine(physicalPath, candidate))
            .FirstOrDefault(candidate => allFiles.Contains(candidate, StringComparer.OrdinalIgnoreCase));
        folder.CoverImagePath = coverFile is null ? null : Path.GetFileName(coverFile);

        var playableFiles = allFiles
            .Where(f => PlayableExtensions.Contains(Path.GetExtension(f)))
            .ToList();

        foreach (var filePath in playableFiles)
        {
            await AddTrackAsync(folder.RecordId, filePath);
        }

        results.Add($"{name}: {playableFiles.Count} media file(s)");

        foreach (var subDirectory in Directory.GetDirectories(physicalPath))
        {
            await ScanFolderAsync(subDirectory, menuId, folder.RecordId, null, results);
        }

        return folder.RecordId;
    }

    private async Task AddTrackAsync(Guid folderId, string filePath)
    {
        var track = new MediaTrack
        {
            RecordId = Guid.NewGuid(),
            FolderId = folderId,
            FileName = Path.GetFileName(filePath)
        };
        await _context.MediaTracks.AddAsync(track);

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
