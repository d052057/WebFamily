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
    /// under the given menu, merging all roots into one tree. A small list of
    /// known pure pass-through wrapper folder names (Songs, Etc, ...) is
    /// peeled through unconditionally; everything else - including
    /// multi-level collections like AmericanMusics - is treated as a real
    /// end-item, see MediaFolderScanService.ScanForEndItemsAsync for why
    /// shape alone can't safely make that call.
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
    private static readonly HashSet<string> BookExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",".epub", ".mobi", ".azw3", ".djvu", ".cbz", ".cbr",".txt"
    };
    private static readonly HashSet<string> PhotoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff "
    };

    private static readonly HashSet<string> PlayableExtensions =
    new([.. AudioExtensions, .. VideoExtensions],
        StringComparer.OrdinalIgnoreCase);

    //private static readonly HashSet<string> PlayableExtensions =
    //    new(AudioExtensions.Union(VideoExtensions), StringComparer.OrdinalIgnoreCase);

    // Folders that belong to a different, already-existing app feature
    // entirely (rpm has its own dedicated tables/UI) - skipped outright.
    private static readonly HashSet<string> ExcludedFolderNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "rpm"
    };

    // Folders known to be pure pass-through wrappers - no identity of their
    // own, exactly one collection nested inside, peeled through regardless of
    // what that one collection contains. This can't be inferred from shape
    // alone: a folder like this is structurally identical to an artist with
    // exactly one album (no songs directly inside, one sub-folder) - only the
    // name reliably tells them apart. Note that what's INSIDE the wrapper
    // (e.g. AmericanMusics, Variety) is NOT listed here - those are
    // themselves real multi-level end-items (their own assembly, with every
    // artist inside as its child), not further wrappers to peel through.
    private static readonly HashSet<string> KnownCollectionFolderNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "Songs", "Etc"
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

    // Tracks top-level (artist-level) names already used in the current scan
    // run, so a genuine name collision - two real, different folders that
    // happen to share a name - gets auto-renamed instead of aborting the
    // whole scan when SaveChanges runs at the end. Reset at the start of
    // every ScanAsync call.
    private readonly HashSet<string> _usedTopLevelNames = new(StringComparer.OrdinalIgnoreCase);

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

        _usedTopLevelNames.Clear();

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

            foreach (var topLevelDir in Directory.GetDirectories(root.PhysicalPath))
            {
                await ScanForEndItemsAsync(topLevelDir, menuRecord.RecordId, parentFolderId: null, root.UrlPrefix, results);
            }
        }

        await _context.SaveChangesAsync();
        results.Add("Scan complete");
        return results;
    }

    /// <summary>
    /// Decides whether physicalPath is a real end-item (an artist/assembly) or
    /// a pure pass-through wrapper that should be looked straight through:
    ///   - Its name is a known pure wrapper (Songs, Etc, ...)? -> peel
    ///     straight through it, no matter what it contains - each sub-folder
    ///     is evaluated the same way, and whatever real end-items are found
    ///     underneath attach directly to parentFolderId, as if this folder
    ///     were never there. A wrapper has no identity of its own: it's a
    ///     single pass-through to exactly one real collection - e.g. "Songs"
    ///     to "AmericanMusics".
    ///   - Otherwise -> it's confirmed as an end-item, full stop - whether it
    ///     has songs directly inside (a simple artist like "got"), one album,
    ///     several albums, or a whole multi-level collection of many artists
    ///     underneath it (like "AmericanMusics" itself - a legitimate
    ///     multi-level assembly in its own right, not a wrapper). Shape alone
    ///     can't safely make this call: an artist with exactly one album (no
    ///     loose songs) looks structurally identical to a pure wrapper. Only
    ///     the name reliably tells the two apart, which is why the wrapper
    ///     list above exists at all - and why it deliberately does NOT
    ///     include AmericanMusics/Variety, which are end-items, not wrappers.
    ///   - Empty (no files, no sub-folders)? -> nothing here, skipped.
    /// </summary>
    private async Task ScanForEndItemsAsync(string physicalPath, Guid menuId, Guid? parentFolderId, string currentUrlPrefix, List<string> results)
    {
        var name = Path.GetFileName(physicalPath.TrimEnd(Path.DirectorySeparatorChar));

        if (ExcludedFolderNames.Contains(name))
        {
            results.Add($"{name}: skipped (belongs to a different feature)");
            return;
        }

        if (KnownCollectionFolderNames.Contains(name))
        {
            // Peeled through, but its name is still a real folder on disk -
            // the URL has to include it even though no MediaFolder row does,
            // or every file underneath ends up pointing one folder short of
            // where it actually lives.
            var nextUrlPrefix = $"{currentUrlPrefix}/{name}";
            foreach (var sub in Directory.GetDirectories(physicalPath))
            {
                await ScanForEndItemsAsync(sub, menuId, parentFolderId, nextUrlPrefix, results);
            }
            return;
        }

        var hasPlayableFiles = currentUrlPrefix switch
        {
            "books" => Directory.EnumerateFiles(physicalPath).Any(f => BookExtensions.Contains(Path.GetExtension(f))),
            "photos" => Directory.EnumerateFiles(physicalPath).Any(f => PhotoExtensions.Contains(Path.GetExtension(f))),
            _ => Directory.EnumerateFiles(physicalPath).Any(f => PlayableExtensions.Contains(Path.GetExtension(f)))
        };

        //var hasPlayableFiles = Directory.GetFiles(physicalPath)
        //    .Any(f => PlayableExtensions.Contains(Path.GetExtension(f)));
        var hasSubDirectories = Directory.GetDirectories(physicalPath).Length > 0;

        if (!hasPlayableFiles && !hasSubDirectories)
        {
            results.Add($"{name}: empty, skipped");
            return;
        }

        await ScanFolderAsync(physicalPath, menuId, parentFolderId, currentUrlPrefix, results);
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

        // Top-level folders can genuinely collide (two different, unrelated
        // folders that happen to share a name) - nested folders can't, since
        // a real directory can't have two children with the same name.
        if (parentFolderId is null)
        {
            name = DisambiguateTopLevelName(name);
        }

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

        // Filenames only need to be unique within this one folder - scoped
        // locally per call, unlike top-level names which persist across the
        // whole scan. A genuine collision here (e.g. two files differing only
        // by case, or by a Unicode quirk the filesystem tolerates but SQL
        // Server's default collation doesn't) gets disambiguated rather than
        // aborting the scan.
        var usedFileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var filePath in playableFiles)
        {
            // Trimmed before comparison AND storage: SQL Server's default
            // string comparison ignores trailing whitespace, .NET's does not -
            // an untrimmed name can look unique here yet still collide at the
            // database, which is exactly what was happening.
            var fileName = DisambiguateFileName(Path.GetFileName(filePath).Trim(), usedFileNames);
            await AddTrackAsync(folder.RecordId, filePath, fileName);
        }

        results.Add($"{name}: {playableFiles.Count} media file(s)");

        foreach (var subDirectory in Directory.GetDirectories(physicalPath))
        {
            var subName = Path.GetFileName(subDirectory.TrimEnd(Path.DirectorySeparatorChar));
            if (ExcludedFolderNames.Contains(subName))
            {
                results.Add($"{subName}: skipped (belongs to a different feature)");
                continue;
            }

            await ScanFolderAsync(subDirectory, menuId, folder.RecordId, null, results);
        }

        return folder.RecordId;
    }

    // Appends a numeric suffix if this exact top-level name was already used
    // earlier in this scan run - keeps every real folder's content, just
    // gives the second (third, ...) one a distinguishable name instead of
    // silently failing the whole scan on a unique-index violation.
    private string DisambiguateTopLevelName(string name)
    {
        if (_usedTopLevelNames.Add(name))
        {
            return name;
        }

        var suffix = 2;
        string candidate;
        do
        {
            candidate = $"{name} ({suffix})";
            suffix++;
        } while (!_usedTopLevelNames.Add(candidate));

        return candidate;
    }

    // Same idea as DisambiguateTopLevelName, but scoped to a fresh HashSet
    // per folder (passed in) rather than an instance field, and preserves
    // the extension when appending a suffix.
    private static string DisambiguateFileName(string fileName, HashSet<string> usedNames)
    {
        if (usedNames.Add(fileName))
        {
            return fileName;
        }

        var extension = Path.GetExtension(fileName);
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        var suffix = 2;
        string candidate;
        do
        {
            candidate = $"{baseName} ({suffix}){extension}";
            suffix++;
        } while (!usedNames.Add(candidate));

        return candidate;
    }

    private async Task AddTrackAsync(Guid folderId, string filePath, string fileName)
    {
        var track = new MediaTrack
        {
            RecordId = Guid.NewGuid(),
            FolderId = folderId,
            FileName = fileName
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
