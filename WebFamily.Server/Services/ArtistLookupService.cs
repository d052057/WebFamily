using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Services;

/// <summary>
/// One album's worth of artist data, as produced by the iTunes-XML-to-JSON
/// converter. TrackArtists is only populated for compilation/multi-artist
/// discs; for a normal single-artist album it can be omitted entirely and
/// every track falls back to AlbumArtist.
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
    /// Per-track artist. Tries album-scoped matching first, then falls back
    /// to a global track-title match across every album (see remarks on
    /// ArtistLookupService).
    /// </summary>
    Task<string?> GetTrackArtistAsync(string albumTitle, string trackTitle);
}

/// <summary>
/// Reads the JSON shape from ApplicationSettings.ArtistLookupFilePath:
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
/// Matching is case-insensitive and ignores leading track numbers /
/// punctuation differences. In this library, the DB's album titles are
/// generic cover-file codes ("RPM-03") that never match iTunes' descriptive
/// album names, so GetTrackArtistAsync falls back to a GLOBAL track-title
/// index (built once at load time, flattening every album's TrackArtists)
/// whenever the album-scoped lookup fails. A track title credited to more
/// than one distinct artist across different albums is left unmatched by
/// the fallback rather than guessed.
/// </summary>
public class ArtistLookupService : IArtistLookupService
{
    private readonly ILogger<ArtistLookupService> _logger;
    private readonly string? _filePath;

    private Dictionary<string, ArtistLookupAlbum>? _albumsByNormalizedTitle;
    private Dictionary<string, string>? _globalTrackArtists;
    private HashSet<string>? _ambiguousTrackTitles;

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

        var parsed = TrackTitleParser.Extract(trackTitle);
        var normalizedTrack = Normalize(parsed.CleanTitle);

        if (albums.TryGetValue(Normalize(albumTitle), out var album))
        {
            foreach (var (candidateTitle, artist) in album.TrackArtists)
            {
                if (Normalize(candidateTitle) == normalizedTrack)
                    return artist;
            }
        }

        if (_ambiguousTrackTitles != null && _ambiguousTrackTitles.Contains(normalizedTrack))
            return null;

        if (_globalTrackArtists != null && _globalTrackArtists.TryGetValue(normalizedTrack, out var globalArtist))
            return globalArtist;

        return null;
    }

    private async Task<Dictionary<string, ArtistLookupAlbum>?> EnsureLoadedAsync()
    {
        if (_albumsByNormalizedTitle != null) return _albumsByNormalizedTitle;
        if (_loadAttempted) return null;

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

            var allTrackEntries = list
                .SelectMany(a => a.TrackArtists.Select(kv => new
                {
                    NormalizedTitle = Normalize(kv.Key),
                    Artist = kv.Value
                }))
                .Where(e => !string.IsNullOrEmpty(e.NormalizedTitle) && !string.IsNullOrWhiteSpace(e.Artist));

            var grouped = allTrackEntries
                .GroupBy(e => e.NormalizedTitle)
                .ToList();

            _ambiguousTrackTitles = grouped
                .Where(g => g.Select(e => e.Artist).Distinct().Count() > 1)
                .Select(g => g.Key)
                .ToHashSet();

            _globalTrackArtists = grouped
                .Where(g => !_ambiguousTrackTitles.Contains(g.Key))
                .ToDictionary(g => g.Key, g => g.First().Artist);

            if (_ambiguousTrackTitles.Count > 0)
            {
                _logger.LogWarning(
                    "{Count} track title(s) map to more than one distinct artist across albums and were left unmatched by the global fallback: {Titles}",
                    _ambiguousTrackTitles.Count,
                    string.Join(", ", _ambiguousTrackTitles.Take(20)));
            }

            _logger.LogInformation(
                "Loaded artist lookup for {AlbumCount} albums ({GlobalTrackCount} globally matchable tracks, {AmbiguousCount} ambiguous) from {FilePath}",
                list.Count, _globalTrackArtists.Count, _ambiguousTrackTitles.Count, _filePath);
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