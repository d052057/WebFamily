using Microsoft.EntityFrameworkCore;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public interface IMediaFolderTreeService
{
    /// <summary>
    /// Returns the full folder tree for a menu (e.g. every artist, and
    /// everything nested under each) in one shot. Fine at personal-library
    /// scale; if a library grows large enough that this gets slow, swap this
    /// for a "children of one folder" call instead and fetch lazily.
    /// </summary>
    /// <param name="menu">MediaMenu row this data is filed under (e.g. "musics").</param>
    /// <param name="urlRootPath">
    /// URL-facing prefix for reaching these files under /medias - NOT
    /// necessarily the same string as menu (e.g. menu "musics" can be scanned
    /// from urlRootPath "musics/AmericanMusics"). Forward slashes only.
    /// </param>
    Task<List<MediaFolderTreeDto>> GetFolderTree(string menu, string urlRootPath);
}

public class MediaFolderTreeService : IMediaFolderTreeService
{
    private readonly WebFamilyDbContext _context;

    public MediaFolderTreeService(WebFamilyDbContext context)
    {
        _context = context;
    }

    public async Task<List<MediaFolderTreeDto>> GetFolderTree(string menu, string urlRootPath)
    {
        var menuRecord = await _context.MediaMenus.SingleOrDefaultAsync(m => m.Menu == menu);
        if (menuRecord is null)
        {
            return new List<MediaFolderTreeDto>();
        }

        // Two queries total, regardless of how deep or wide the tree is -
        // the nesting is reconstructed in memory below.
        var folders = await _context.MediaFolders
            .Where(f => f.MenuId == menuRecord.RecordId)
            .ToListAsync();

        var folderIds = folders.Select(f => f.RecordId).ToList();
        var tracks = await _context.MediaTracks
            .Where(t => folderIds.Contains(t.FolderId))
            .ToListAsync();

        var foldersByParent = folders.ToLookup(f => f.ParentFolderId);
        var tracksByFolder = tracks.ToLookup(t => t.FolderId);

        List<MediaFolderTreeDto> BuildLevel(Guid? parentId, string parentRelativePath)
        {
            return foldersByParent[parentId]
                .OrderBy(f => f.Name)
                .Select(f =>
                {
                    var relativePath = string.IsNullOrEmpty(parentRelativePath)
                        ? f.Name
                        : $"{parentRelativePath}/{f.Name}";

                    return new MediaFolderTreeDto
                    {
                        Id = f.RecordId,
                        Name = f.Name,
                        CoverImagePath = f.CoverImagePath is null
                            ? null
                            : $"{urlRootPath}/{relativePath}/{f.CoverImagePath}",
                        Folders = BuildLevel(f.RecordId, relativePath),
                        Tracks = tracksByFolder[f.RecordId]
                            .OrderBy(t => t.TrackNumber ?? int.MaxValue)
                            .ThenBy(t => t.FileName)
                            .Select(t => new MediaTrackDto
                            {
                                Id = t.RecordId,
                                FileName = t.FileName,
                                DisplayTitle = t.Title ?? Path.GetFileNameWithoutExtension(t.FileName),
                                Artist = t.Artist,
                                Album = t.Album,
                                TrackNumber = t.TrackNumber,
                                Duration = t.Duration,
                                // Relative to the media root; the client already knows
                                // its own base media URL and prepends it (same pattern
                                // as the existing play-media/play-audio components).
                                Url = $"{urlRootPath}/{relativePath}/{t.FileName}"
                            }).ToList()
                    };
                }).ToList();
        }

        return BuildLevel(null, string.Empty);
    }
}
