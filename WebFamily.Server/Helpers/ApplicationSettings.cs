#nullable disable

namespace WebFamily.Server.Helpers;

//public class AppFolderSettings
//{
//    public ApplicationSettings? ApplicationSettings { get; set; }

//}
public class ApplicationSettings
{
    // The URL path prefix static media files are served under (see
    // Program.cs's ConfigureMediaFiles). This is a fixed routing constant,
    // NOT tied to MediaDrive - it doesn't change if the physical drive does.
    public const string MediaRequestPath = "/medias";
    //public string AssetSongFolder { get; set; }
    public string Download { get; set; }
    //public string ClientURL { get; set; }
    public string MediaDrive { get; set; } = @"c:\medias";
    //public string ApiKey { get; set; }
    public string AssetAlbumFolder { get; set; }
    public string AssetVideoFolder { get; set; }
    public string AssetMovieFolder { get; set; }
    public string AssetBookFolder { get; set; }
    public string AssetPhotoFolder { get; set; }
    //public string AssetEnglishSongFolder { get; set; }
    public string AssetRpmFolder { get; set; }
    public string AssetRpmCoverFolder { get; set; }
    //public string AssetCCFolder { get; set; }

    public string AssetTextFolder { get; set; }
    public string TrashFolder { get; set; }

    /// <summary>
    /// Where the Duplicates page moves files "deleted" for final review.
    /// Keep it OUTSIDE MediaDrive so rescans don't pick the files up again.
    /// </summary>
    public string ReviewFolder { get; set; } = @"D:\medias_review";

    /// <summary>Duplicate-file finder options (scanner + Duplicates page).</summary>
    public DuplicateScanSettings DuplicateScan { get; set; } = new();
    /// <summary>
    /// Full path to the JSON artist lookup file (see IArtistLookupService),
    /// generated from the iTunes Library XML export. Optional: if unset or
    /// the file doesn't exist, artist backfill is silently skipped and
    /// Rpm.Artist / RpmTrack.Artist are simply left null during regen.
    /// </summary>
    public string ArtistLookupFilePath { get; set; }

    /// <summary>
    /// File extensions MediaFolderScanService treats as playable, by media
    /// type. Configurable here instead of hard-coded so adding/removing an
    /// extension (e.g. a new ebook format) doesn't need a recompile - just
    /// an appsettings.json edit and a restart. Extensions must include the
    /// leading dot (".mp3", not "mp3"); case doesn't matter.
    /// </summary>
    public MediaScanExtensionsSettings MediaScanExtensions { get; set; } = new();

    /// <summary>
    /// Scan options for the menus in the MediaMenu table, keyed by MediaMenu.Menu (case-insensitive).
    /// A menu needs an entry ONLY when it differs from the defaults: its folder is the menu's own name
    /// under MediaDrive, and it scans Audio + Video files. A new MediaMenu row such as "podcasts" therefore
    /// works with no settings at all.
    /// </summary>
    public Dictionary<string, MediaMenuScanSettings> MediaMenus { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    private static readonly string[] DefaultMenuExtensionGroups = { "Audio", "Video" };

    /// <summary>Folder to scan for a menu, relative to MediaDrive.</summary>
    public string GetMenuFolder(string menu) =>
        MediaMenus.TryGetValue(menu, out var m) && !string.IsNullOrWhiteSpace(m?.Folder) ? m.Folder.Trim() : menu;

    /// <summary>Which MediaScanExtensions groups (Audio, Video, Book, Photo) a menu's scan accepts.</summary>
    public IReadOnlyList<string> GetMenuExtensionGroups(string menu) =>
        MediaMenus.TryGetValue(menu, out var m) && m?.ExtensionGroups is { Count: > 0 } ? m.ExtensionGroups : DefaultMenuExtensionGroups;

    //public string GetUrlYoutube()
    //{
    //    return "https://www.googleapis.com/youtube/v3/playlistItems?key=" + ApiKey + "&part=snippet&maxResults=12&playlistId=";
    //}
}

public class MediaMenuScanSettings
{
    /// <summary>Folder under MediaDrive. Empty = the menu's own name.</summary>
    public string Folder { get; set; }

    /// <summary>Any of Audio, Video, Book, Photo. Empty = Audio and Video.</summary>
    public List<string> ExtensionGroups { get; set; }
}

public class MediaScanExtensionsSettings
{
    public List<string> Audio { get; set; } = new();
    public List<string> Video { get; set; } = new();
    public List<string> Book { get; set; } = new();
    public List<string> Photo { get; set; } = new();
}

public class DuplicateScanSettings
{
    /// <summary>Duplicate groups shown per page.</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>Files with a longer full path are skipped (MediaFiles.FullPath is NVARCHAR(450)).</summary>
    public int MaxPathLength { get; set; } = 450;

    /// <summary>Files smaller than this are ignored (1 skips empty files).</summary>
    public long MinFileSizeBytes { get; set; } = 1;

    /// <summary>Read buffer used when computing SHA-256, in bytes.</summary>
    public int HashBufferBytes { get; set; } = 81920;

    /// <summary>
    /// Which MediaScanExtensions groups are scanned: Photo, Video, Audio, Book.
    /// Leave empty to scan every file under MediaDrive. Only Photo files get the View button.
    /// </summary>
    public List<string> ScanTypes { get; set; } = new() { "Photo", "Video", "Audio", "Book" };
}
