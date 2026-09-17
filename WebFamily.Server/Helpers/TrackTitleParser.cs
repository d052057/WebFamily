using System.Text.RegularExpressions;

namespace WebFamily.Server.Helpers;

/// <summary>
/// Extracts a leading track number (and optionally a disc number) from a
/// track's source file name, so RpmTrack.TrackNumber doesn't depend on
/// alphabetical sort of the title.
///
/// Handles the common ripped-CD naming patterns:
///   "01 - Song Name.wav"     -> track 1
///   "1. Song Name.wav"       -> track 1
///   "Track 01 - Song.wav"    -> track 1
///   "01_Song.wav"            -> track 1
///   "(01) Song.wav"          -> track 1
///   "1-01 Song.wav"          -> disc 1, track 1  (multi-disc sets)
///
/// Titles that don't match any pattern return TrackNumber = null and the
/// original title untouched, so the caller can decide how to sort/flag
/// them (see RpmServices / UpdateDataBaseServices for how the null case
/// is handled).
/// </summary>
public static class TrackTitleParser
{
    // "1-01 Song Name" - disc-qualified track number, common in multi-disc
    // rips. Captures disc number and track number separately.
    private static readonly Regex MultiDiscPattern = new(
        @"^\s*(\d{1,2})-(\d{1,3})[\s\.\-_)]+\s*(.+)$",
        RegexOptions.Compiled);

    // "01 - Song", "1. Song", "Track 01 - Song", "01_Song", "(01) Song"
    private static readonly Regex TrackNumberPattern = new(
        @"^\s*(?:track\s*)?\(?(\d{1,3})\)?[\s\.\-_)]+\s*(.+)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public readonly struct ParsedTrack
    {
        public int? DiscNumber { get; init; }
        public int? TrackNumber { get; init; }
        public string CleanTitle { get; init; }
    }

    /// <summary>
    /// Parses a raw file name (with or without extension) into a disc
    /// number (if present), a track number, and the title with the
    /// leading number stripped off. Returns TrackNumber = null,
    /// CleanTitle = the trimmed original when nothing matches.
    /// </summary>
    public static ParsedTrack Extract(string rawFileName)
    {
        if (string.IsNullOrWhiteSpace(rawFileName))
        {
            return new ParsedTrack { DiscNumber = null, TrackNumber = null, CleanTitle = rawFileName };
        }

        var nameWithoutExtension = System.IO.Path.GetFileNameWithoutExtension(rawFileName).Trim();

        var discMatch = MultiDiscPattern.Match(nameWithoutExtension);
        if (discMatch.Success
            && int.TryParse(discMatch.Groups[1].Value, out var discNum)
            && int.TryParse(discMatch.Groups[2].Value, out var discTrackNum))
        {
            return new ParsedTrack
            {
                DiscNumber = discNum,
                TrackNumber = discTrackNum,
                CleanTitle = discMatch.Groups[3].Value.Trim()
            };
        }

        var match = TrackNumberPattern.Match(nameWithoutExtension);
        if (match.Success && int.TryParse(match.Groups[1].Value, out var trackNum))
        {
            return new ParsedTrack
            {
                DiscNumber = null,
                TrackNumber = trackNum,
                CleanTitle = match.Groups[2].Value.Trim()
            };
        }

        return new ParsedTrack
        {
            DiscNumber = null,
            TrackNumber = null,
            CleanTitle = nameWithoutExtension
        };
    }
}
