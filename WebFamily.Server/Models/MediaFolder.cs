#nullable disable
namespace WebFamily.Server.Models;

public partial class MediaFolder
{
    public Guid RecordId { get; set; }

    public Guid MenuId { get; set; }

    // Null = top-level folder (e.g. an artist). Set = nested folder (e.g. an
    // album, or a disc under an album) - self-reference lets this go to any depth.
    public Guid? ParentFolderId { get; set; }
    public string? RootPath { get; set; }
    public string Name { get; set; }

    // Path to cover.jpg/folder.jpg/album.jpg etc. found directly in this
    // folder during scan, relative to the media root. Null if none found.
    public string CoverImagePath { get; set; }

    public DateTime Datetime { get; set; }

    public virtual MediaMenu Menu { get; set; }

    public virtual MediaFolder ParentFolder { get; set; }



    public virtual ICollection<MediaFolder> ChildFolders { get; set; } = new List<MediaFolder>();

    public virtual ICollection<MediaTrack> Tracks { get; set; } = new List<MediaTrack>();
}
