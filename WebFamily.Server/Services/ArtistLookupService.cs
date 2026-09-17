using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Services;

/// <summary>
/// One album's worth of artist data, as produced by the (separate, not yet
/// written) iTunes-XML-to-JSON converter. TrackArtists is only populated
/// for compilation/multi-artist discs; for a normal single-artist album it
/// can be omitted entirely and every track falls back to AlbumArtist.
/// </summary>
public class ArtistLookupAlbum
{
    [JsonPropertyName("albumTitle")]
    public string AlbumTitle { get; set; } = string.Empty;

    [JsonPropertyName("albumArtist")]
    public string? AlbumArtist { get; set; }

    [JsonPropertyName("trackArtists")]
    public Dictionary<string, string> TrackArtists { get; set; } = new();
}

public interface IArtistLookupService
{
    /// <summary>
    /// Album-level artist for the given album title (as it appears on the
    /// Rpm cover file name, extension stripped), or null if no match was
    /// found or the lookup file isn't present yet.
    /// </summary>
    Task<string?> GetAlbumArtistAsync(string albumTitle);

    /// <summary>
    /// Per-track artist override for compilation discs. Falls back to null
    /// (meaning "use the album artist") if the track has no override entry.
    /// </summary>
    Task<string?> GetTrackArtistAsync(string albumTitle, string trackTitle);
}

/// <summary>
/// Reads WebFamily.Server/Services/ArtistLookupService.cs's expected JSON
/// shape from ApplicationSettings.ArtistLookupFilePath:
///
///   [
///     {
///       "albumTitle": "Abbey Road",
///       "albumArtist": "The Beatles",
///       "trackArtists": {}
///     },
///     {
///       "albumTitle": "Now That's What I Call Music 42",
///       "albumArtist": null,
///       "trackArtists": {
///         "Everybody Hurts": "R.E.M.",
///         "Wonderwall": "Oasis"
///       }
///     }
///   ]
///
/// This file doesn't exist yet - it gets generated once the iTunes Library
/// XML export is processed. Until then, every lookup returns null and the
/// regen process simply leaves Artist unset, exactly as it does today.
/// Matching is case-insensitive and ignores leading track numbers /
/// punctuation differences, since file-system names and iTunes' displayed
/// names rarely match byte-for-byte.
/// </summary>
public class ArtistLookupService : IArtistLookupService
{
    private readonly ILogger<ArtistLookupService> _logger;
    private readonly string? _filePath;

    private Dictionary<string, ArtistLookupAlbum>? _albumsByNormalizedTitle;
    private bool _loadAttempted;
    private readonly SemaphoreSlim _loadLock = new(1, 1);

    public ArtistLookupService(IOptions<ApplicationSettings> appSettings, ILogger<ArtistLookupService> logger)
    {
        _logger = logger;
        _filePath = appSettings.Value.ArtistLookupFilePath;
    }

    public async Task<string?> GetAlbumArtistAsync(string albumTitle)
    {
        var albums = await EnsureLoadedAsync();
        if (albums == null) return null;

        return albums.TryGetValue(Normalize(albumTitle), out var album)
            ? album.AlbumArtist
            : null;
    }

    public async Task<string?> GetTrackArtistAsync(string albumTitle, string trackTitle)
    {
        var albums = await EnsureLoadedAsync();
        if (albums == null) return null;

        if (!albums.TryGetValue(Normalize(albumTitle), out var album))
            return null;

        // Track titles on disk are file names like "01 - Song.wav"; strip
        // the leading number/extension the same way TrackTitleParser does
        // before comparing against iTunes' plain "Song" track names.
        var parsed = TrackTitleParser.Extract(trackTitle);
        var normalizedTrack = Normalize(parsed.CleanTitle);

        foreach (var (candidateTitle, artist) in album.TrackArtists)
        {
            if (Normalize(candidateTitle) == normalizedTrack)
                return artist;
        }

        return null;
    }

    private async Task<Dictionary<string, ArtistLookupAlbum>?> EnsureLoadedAsync()
    {
        if (_albumsByNormalizedTitle != null) return _albumsByNormalizedTitle;
        if (_loadAttempted) return null; // already tried and failed/missing this run

        await _loadLock.WaitAsync();
        try
        {
            if (_albumsByNormalizedTitle != null) return _albumsByNormalizedTitle;
            if (_loadAttempted) return null;

            _loadAttempted = true;

            if (string.IsNullOrWhiteSpace(_filePath))
            {
                _logger.LogInformation(
                    "ArtistLookupFilePath is not configured - artist backfill skipped, Rpm.Artist will stay null.");
                return null;
            }

            if (!File.Exists(_filePath))
            {
                _logger.LogInformation(
                    "Artist lookup file not found at {FilePath} - artist backfill skipped, Rpm.Artist will stay null.",
                    _filePath);
                return null;
            }

            var json = await File.ReadAllTextAsync(_filePath);
            var list = JsonSerializer.Deserialize<List<ArtistLookupAlbum>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<ArtistLookupAlbum>();

            _albumsByNormalizedTitle = list
                .GroupBy(a => Normalize(a.AlbumTitle))
                .ToDictionary(g => g.Key, g => g.First());

            _logger.LogInformation("Loaded artist lookup for {Count} albums from {FilePath}", list.Count, _filePath);
            return _albumsByNormalizedTitle;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load artist lookup file at {FilePath} - artist backfill skipped this run.", _filePath);
            return null;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    /// <summary>
    /// Case-insensitive, punctuation/whitespace-tolerant key so "Greatest
    /// Hits" and "Greatest Hits!" (or extra spacing) still match.
    /// </summary>
    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var chars = value
            .Where(c => char.IsLetterOrDigit(c))
            .Select(char.ToLowerInvariant)
            .ToArray();

        return new string(chars);
    }
}
