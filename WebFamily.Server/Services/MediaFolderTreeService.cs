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
    Task<List<MediaFolderTreeDto>> GetFolderTree(string menu);
}

public class MediaFolderTreeService : IMediaFolderTreeService
{
    private readonly WebFamilyDbContext _context;

    public MediaFolderTreeService(WebFamilyDbContext context)
    {
        _context = context;
    }

    public async Task<List<MediaFolderTreeDto>> GetFolderTree(string menu)
    {
        var menuRecord = await _context.MediaMenus.SingleOrDefaultAsync(m => m.Menu == menu);
        if (menuRecord is null)
        {
            return new List<MediaFolderTreeDto>();
        }

        // Three queries total, regardless of how deep or wide the tree is -
        // the nesting is reconstructed in memory below. All three filter via
        // a server-side join (MenuId / Folder.MenuId) rather than pulling
        // every folder id into an in-memory list and filtering with
        // .Contains() - that pattern turns into a huge SQL "IN (...)" list
        // and gets dramatically slower as a menu's folder count grows (this
        // is exactly what previously caused a SQL timeout on "books").
        var folders = await _context.MediaFolders
            .Where(f => f.MenuId == menuRecord.RecordId)
            .ToListAsync();

        var tracks = await _context.MediaTracks
            .Where(t => t.Folder.MenuId == menuRecord.RecordId)
            .ToListAsync();

        var subtitles = await _context.MediaSubtitles
            .Where(s => s.MediaMetaDataRecord.Folder.MenuId == menuRecord.RecordId)
            .ToListAsync();

        var foldersByParent = folders.ToLookup(f => f.ParentFolderId);
        var tracksByFolder = tracks.ToLookup(t => t.FolderId);
        var subtitlesByTrack = subtitles.ToLookup(s => s.MediaMetaDataRecordId);

        List<MediaFolderTreeDto> BuildLevel(Guid? parentId, string? parentRelativePath, HashSet<Guid> ancestors)
        {
            return foldersByParent[parentId]
                .OrderBy(f => f.Name)
                // Guards against a corrupted/cyclic ParentFolderId chain (a
                // folder pointing back to one of its own ancestors, directly or
                // indirectly). Without this, BuildLevel would recurse forever -
                // unbounded recursion crashes the whole process outright in
                // .NET (StackOverflowException can't be caught), which looks
                // to a caller like a request that never returns at all. Normal,
                // non-cyclic data is completely unaffected by this check.
                .Where(f => !ancestors.Contains(f.RecordId))
                .Select(f =>
                {
                    // Top-level folders (parentId is null) start from their OWN
                    // RootPath - a menu can be scanned from more than one
                    // physical root, so each top-level folder knows which one
                    // it came from. Nested folders just extend their parent's
                    // path as before.
                    var relativePath = parentId is null
                        ? $"{f.RootPath}/{f.Name}"
                        : $"{parentRelativePath}/{f.Name}";

                    var childAncestors = new HashSet<Guid>(ancestors) { f.RecordId };

                    return new MediaFolderTreeDto
                    {
                        Id = f.RecordId,
                        Name = f.Name,
                        CoverImagePath = f.CoverImagePath is null
                            ? null
                            : $"{relativePath}/{f.CoverImagePath}",
                        Folders = BuildLevel(f.RecordId, relativePath, childAncestors),
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
                                Type = t.Type,
                                // Relative to the media root; the client already knows
                                // its own base media URL and prepends it (same pattern
                                // as the existing play-media/play-audio components).
                                Url = $"{relativePath}/{t.FileName}",
                                // Subtitles live in a "closecaption" sibling folder next
                                // to the video itself - not a MediaFolder of its own
                                // (that folder name is excluded from the scan tree), so
                                // its files aren't reachable via relativePath the normal
                                // way and need the "closecaption" segment added explicitly.
                                Subtitles = subtitlesByTrack[t.RecordId]
                                    .OrderByDescending(s => s.IsDefault)
                                    .ThenBy(s => s.Language)
                                    .Select(s => new MediaSubtitleDto
                                    {
                                        Language = s.Language,
                                        Label = s.Label,
                                        IsDefault = s.IsDefault,
                                        Url = $"{relativePath}/closecaption/{s.FileName}"
                                    }).ToList()
                            }).ToList()
                    };
                }).ToList();
        }

        return BuildLevel(null, null, new HashSet<Guid>());
    }
}
