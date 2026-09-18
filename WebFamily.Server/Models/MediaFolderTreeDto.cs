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

    // Ready-to-use URL for playback - built server-side so the client never
    // has to reconstruct paths from folder names (which may contain
    // special characters).
    public string Url { get; set; } = string.Empty;
}
