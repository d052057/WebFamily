namespace WebFamily.Server.Models
{
    // Renames an artist/album/disc folder (MediaFolder). No file extension
    // involved - just the folder name.
    public class RenameFolderRequest
    {
        public Guid FolderId { get; set; }
        public string NewName { get; set; } = string.Empty;
    }

    // Renames a track's file on disk. NewFileName is the name WITHOUT
    // extension - the existing extension is preserved automatically, same
    // convention as the existing (legacy) RenameFile endpoint.
    public class RenameTrackRequest
    {
        public Guid TrackId { get; set; }
        public string NewFileName { get; set; } = string.Empty;
    }
}
