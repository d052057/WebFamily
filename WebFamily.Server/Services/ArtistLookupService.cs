using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Services;

/// <summary>
/// One album's worth of artist data, aggregated from iTunes Library.xml.
/// TrackArtists is only populated for compilation/multi-artist discs; for a
/// normal single-artist album it can be empty and every track falls back to
/// AlbumArtist.
/// </summary>
public class ArtistLookupAlbum
{
    public string AlbumTitle { get; set; } = string.Empty;
    public string? AlbumArtist { get; set; }
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
/// Reads and aggregates ApplicationSettings.ArtistLookupFilePath, an iTunes
/// "Library.xml" export (see ITunesLibraryReader for the raw parsing side).
/// Previously this read a pre-aggregated JSON file produced by a separate
/// Python script (WebFamily-tools/itunes-artist-lookup-converter, now
/// retired) - that aggregation (group tracks by album, compute per-track
/// artists, compute a majority-vote album artist) now happens here instead,
/// directly from the raw XML, cutting out the manual conversion step
/// entirely.
///
/// Why per-track artist, not per-album: most personal music libraries - and
/// this one in particular - turn out to be compilation discs, where each
/// track can have a different artist. AlbumArtist is still computed as a
/// convenience fallback, but only when one artist clearly dominates the
/// album (see MajorityThreshold below); otherwise it's left null and every
/// track relies on its own TrackArtists entry.
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
    // If one artist accounts for at least this fraction of an album's
    // tracks, it's used as the album-level fallback artist. Mirrors the
    // threshold the old Python converter used - tune here if it turns out
    // too aggressive/conservative once real data is loaded.
    private const double MajorityThreshold = 0.6;

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
                    "iTunes Library.xml not found at {FilePath} - artist backfill skipped, Rpm.Artist will stay null.",
                    _filePath);
                return null;
            }

            // Parsing a real Library.xml (thousands of tracks) is not
            // instant - kept off the request thread rather than blocking on
            // synchronous XML I/O directly inside this async method.
            var tracks = await Task.Run(() => ITunesLibraryReader.ReadTracks(_filePath));

            var list = new List<ArtistLookupAlbum>();
            foreach (var group in tracks
                         .Where(t => !string.IsNullOrWhiteSpace(t.Album) && !string.IsNullOrWhiteSpace(t.Name))
                         .GroupBy(t => t.Album!))
            {
                var trackArtists = new Dictionary<string, string>();
                var artistCounts = new Dictionary<string, int>();
                var trackCount = 0;

                foreach (var t in group)
                {
                    trackCount++;
                    var artist = NormalizeWhitespace(t.Artist);
                    if (string.IsNullOrEmpty(artist)) continue;

                    // Last-write-wins on a duplicate clean title within one
                    // album, same as the old Python dict assignment did.
                    trackArtists[TrackTitleParser.Extract(t.Name!).CleanTitle] = artist;
                    artistCounts[artist] = artistCounts.GetValueOrDefault(artist) + 1;
                }

                string? albumArtist = null;
                if (artistCounts.Count > 0)
                {
                    var top = artistCounts.OrderByDescending(kv => kv.Value).First();
                    if ((double)top.Value / trackCount >= MajorityThreshold)
                    {
                        albumArtist = top.Key;
                    }
                }

                list.Add(new ArtistLookupAlbum
                {
                    AlbumTitle = group.Key,
                    AlbumArtist = albumArtist,
                    TrackArtists = trackArtists
                });
            }

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
            _logger.LogWarning(ex, "Failed to load/parse iTunes Library.xml at {FilePath} - artist backfill skipped this run.", _filePath);
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

    /// <summary>
    /// Collapses runs of whitespace (some libraries have double-space typos
    /// in artist credits, e.g. "Sin Sisamouth,  Pen Ron") and trims.
    /// </summary>
    private static string NormalizeWhitespace(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }
}