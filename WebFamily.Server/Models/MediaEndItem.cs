#nullable disable
namespace WebFamily.Server.Models;

// Maps to MediaEndItemView (see 003_create_media_end_item_view.sql). Keyless -
// this is a read-only view result, not a table you insert/update through EF.
public partial class MediaEndItem
{
    public Guid FolderId { get; set; }

    public Guid MenuId { get; set; }

    public string Name { get; set; }

    public string CoverImagePath { get; set; }
}
