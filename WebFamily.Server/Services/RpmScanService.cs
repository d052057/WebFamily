using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public interface IRpmScanService
{
    /// <summary>
    /// Wipes and rebuilds Rpm/RpmTrack from disk (ApplicationSettings.AssetRpmFolder,
    /// under MediaDrive). Each direct subfolder (except AssetRpmCoverFolder's own
    /// leaf name, which holds shared cover images rather than a record of its
    /// own) becomes one Rpm; every audio file inside becomes a RpmTrack, with
    /// duration read via TagLib, track number/title parsed via
    /// TrackTitleParser, and artist backfilled via IArtistLookupService (reads
    /// artist-lookup.json - produced by the separate, standalone
    /// WebFamily-tools/itunes-artist-lookup-converter Python script; this
    /// service only ever reads its output, never runs it).
    /// </summary>
    Task<List<string>> ScanAsync();
}

public class RpmScanService : IRpmScanService
{
    private readonly WebFamilyDbContext _context;
    private readonly ApplicationSettings _appSettings;
    private readonly IArtistLookupService _artistLookup;
    private readonly MimeType _mimeType = new();
    private readonly ILogger<RpmScanService>? _logger;

    public RpmScanService(
        WebFamilyDbContext context,
        IOptions<ApplicationSettings> appSettings,
        IArtistLookupService artistLookup,
        ILogger<RpmScanService>? logger = null)
    {
        _context = context;
        _appSettings = appSettings?.Value ?? throw new ArgumentNullException(nameof(appSettings));
        _artistLookup = artistLookup;
        _logger = logger;
    }

    public async Task<List<string>> ScanAsync()
    {
        var results = new List<string>();

        if (string.IsNullOrWhiteSpace(_appSettings.AssetRpmFolder))
        {
            results.Add("AssetRpmFolder is not configured.");
            return results;
        }

        var rpmRoot = Path.Combine(_appSettings.MediaDrive, _appSettings.AssetRpmFolder);
        if (!Directory.Exists(rpmRoot))
        {
            results.Add($"Directory not found: {rpmRoot}");
            return results;
        }

        // AssetRpmCoverFolder is a shared folder of cover images sitting
        // alongside the RPM record folders, not a record of its own - excluded
        // by its own leaf folder name, same idea as MediaFolderScanService's
        // ExcludedFolderNames.
        var coverFolderName = string.IsNullOrWhiteSpace(_appSettings.AssetRpmCoverFolder)
            ? null
            : Path.GetFileName(_appSettings.AssetRpmCoverFolder.TrimEnd('\\', '/'));

        // Reuses the same configurable list everything else scans with
        // (see MediaFolderScanService/appsettings.json), rather than a
        // separate hard-coded set here - one place to add/remove an audio
        // extension for the whole app.
        var configuredAudio = _appSettings.MediaScanExtensions?.Audio;
        var audioExtensions = new HashSet<string>(
            configuredAudio is { Count: > 0 } ? configuredAudio : DefaultAudioExtensions,
            StringComparer.OrdinalIgnoreCase);

        // Full wipe and rebuild, same reasoning as MediaFolderScanService: a
        // partial upsert can't tell "renamed" from "deleted" apart. RpmTrack
        // rows cascade-delete automatically via the FK to Rpm (unlike
        // MediaSubtitle -> MediaTrack, this relationship's FK has no explicit
        // ClientSetNull override in the scaffolded model, meaning the real DB
        // constraint is CASCADE here).
        var existingRpms = await _context.Rpms.ToListAsync();
        _context.Rpms.RemoveRange(existingRpms);
        await _context.SaveChangesAsync();
        results.Add($"Cleared {existingRpms.Count} existing record(s)");

        foreach (var folder in Directory.GetDirectories(rpmRoot))
        {
            var title = Path.GetFileName(folder.TrimEnd(Path.DirectorySeparatorChar));
            if (coverFolderName != null && string.Equals(title, coverFolderName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var audioFiles = Directory.GetFiles(folder)
                .Where(f => audioExtensions.Contains(Path.GetExtension(f)))
                .ToList();

            if (audioFiles.Count == 0)
            {
                results.Add($"{title}: no audio files, skipped");
                continue;
            }

            var rpm = new Rpm
            {
                RecordId = Guid.NewGuid(),
                Title = title,
                DateTime = DateTime.Now,
                // MIME type for the <source type=""> when playing (see
                // rpm.service.ts) - one value per record rather than per
                // track, on the assumption a single RPM's tracks are all
                // ripped in the same format. Taken from the first track
                // found; if that assumption is ever wrong for a record with
                // mixed formats, only the first file's format wins here.
                AudioType = _mimeType.Get(audioFiles[0]),
                // Rpm.Type has no established meaning anywhere in the client
                // (searched - nothing reads it), so left null here rather
                // than guessed at.
                Artist = await _artistLookup.GetAlbumArtistAsync(title)
            };
            await _context.Rpms.AddAsync(rpm);

            foreach (var filePath in audioFiles)
            {
                var fileName = Path.GetFileName(filePath);
                var parsed = TrackTitleParser.Extract(fileName);

                int? durationSeconds = null;
                try
                {
                    using var tagFile = TagLib.File.Create(filePath);
                    if (tagFile.Properties is { Duration.TotalSeconds: > 0 } props)
                    {
                        durationSeconds = (int)props.Duration.TotalSeconds;
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Could not read duration for {FilePath}", filePath);
                }

                await _context.RpmTracks.AddAsync(new RpmTrack
                {
                    RecordId = Guid.NewGuid(),
                    RpmId = rpm.RecordId,
                    Title = parsed.CleanTitle,
                    DateTime = DateTime.Now,
                    DurationSeconds = durationSeconds,
                    TrackNumber = parsed.TrackNumber,
                    // Null means "use Rpm.Artist" (RpmTrack.Artist's own
                    // convention) - only set when the lookup finds a genuine
                    // per-track override, i.e. a compilation/multi-artist disc.
                    Artist = await _artistLookup.GetTrackArtistAsync(title, Path.GetFileNameWithoutExtension(fileName))
                });
            }

            results.Add($"{title}: {audioFiles.Count} track(s)");
        }

        await _context.SaveChangesAsync();
        results.Add("RPM regen complete");
        return results;
    }

    private static readonly string[] DefaultAudioExtensions =
        { ".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".wma", ".aiff" };
}
