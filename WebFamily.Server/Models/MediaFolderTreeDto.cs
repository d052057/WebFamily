namespace WebFamily.Server.Models;

/// <summary>
/// One folder node in the tree (an artist, an album, a disc - whatever depth
/// it sits at). Carries its own sub-folders and its own direct tracks, so the
/// same shape works whether an artist has songs directly or several albums deep.
/// </summary>
public class MediaFolderTreeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CoverImagePath { get; set; }
    public List<MediaFolderTreeDto> Folders { get; set; } = new();
    public List<MediaTrackDto> Tracks { get; set; } = new();
}

public class MediaTrackDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;

    // Falls back to the file name (extension stripped) when the ID3 tag
    // didn't have a title - the UI never needs to know which case it is.
    public string DisplayTitle { get; set; } = string.Empty;

    public string Artist { get; set; }
    public string Album { get; set; }
    public int? TrackNumber { get; set; }
    public string Duration { get; set; }

    // MIME type (e.g. "video/mp4"), same value the legacy play-audio/play-media
    // pipeline already exposes - needed for a <video>/<audio> element's
    // <source type="">, mainly relevant for video playback.
    public string Type { get; set; }

    // Ready-to-use URL for playback - built server-side so the client never
    // has to reconstruct paths from folder names (which may contain
    // special characters).
    public string Url { get; set; } = string.Empty;

    // Empty for anything without subtitles (which is most things - only
    // ever populated for video, and only when a sibling "closecaption"
    // folder actually had matching files at scan time).
    public List<MediaSubtitleDto> Subtitles { get; set; } = new();
}

public class MediaSubtitleDto
{
    public string Language { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsDefault { get; set; }

    // Ready-to-use URL, same treatment as MediaTrackDto.Url.
    public string Url { get; set; } = string.Empty;
}
