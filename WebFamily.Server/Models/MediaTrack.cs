#nullable disable
namespace WebFamily.Server.Models;

public partial class MediaTrack
{
    public Guid RecordId { get; set; }

    public Guid FolderId { get; set; }

    // Actual file name on disk - always present, used to build the play URL.
    public string FileName { get; set; }

    // Everything below comes from the ID3 tag and may be null when the
    // file has no tag, or the tag field is blank/"<unknown>".
    public string Title { get; set; }

    public string Artist { get; set; }

    public string Album { get; set; }

    public int? TrackNumber { get; set; }

    public int? Year { get; set; }

    public string Genre { get; set; }

    public string Duration { get; set; }

    public string Type { get; set; }

    public DateTime Datetime { get; set; }

    public virtual MediaFolder Folder { get; set; }
}
