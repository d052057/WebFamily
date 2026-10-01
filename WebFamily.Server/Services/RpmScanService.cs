//#nullable disable

using Microsoft.EntityFrameworkCore;
//using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public interface IRpmScanService
{
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

        var coverFolderName = string.IsNullOrWhiteSpace(_appSettings.AssetRpmCoverFolder)
            ? null
            : Path.GetFileName(_appSettings.AssetRpmCoverFolder.TrimEnd('\\', '/'));

        var configuredAudio = _appSettings.MediaScanExtensions?.Audio;
        var audioExtensions = new HashSet<string>(
            configuredAudio is { Count: > 0 } ? configuredAudio : DefaultAudioExtensions,
            StringComparer.OrdinalIgnoreCase);

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
                AudioType = _mimeType.Get(audioFiles[0]),
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
                    // FIXED: Changed from parsed.CleanTitle to fileName 
                    // This stores the raw "01. ល្មមភ្ញាក់ខ្លួនហើយប្ដី.wav" string into the database
                    Title = fileName,
                    DateTime = DateTime.Now,
                    DurationSeconds = durationSeconds,
                    TrackNumber = parsed.TrackNumber,
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
