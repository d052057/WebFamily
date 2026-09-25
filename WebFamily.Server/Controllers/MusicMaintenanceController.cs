using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Controllers
{
    /// <summary>
    /// Rename/delete for the MediaFolder/MediaTrack tree (the same tables
    /// MediaFolderController's Tree/Scan endpoints use, and what song-browser
    /// displays). This is a separate table set from the legacy
    /// MediaMetaData/MediaDirectory system that MenuController's
    /// RenameFile/DeleteFile operate on - the two are not interchangeable,
    /// see MediaFolderScanService for why (track/folder ids are freshly
    /// generated on every scan and have no relation to MediaMetaData ids).
    ///
    /// Delete never removes a file for good: it moves it into
    /// ApplicationSettings.TrashFolder, mirroring its original relative path,
    /// with a timestamp prefix on its own name so repeat deletes of the same
    /// name never collide. There is no restore endpoint (by design, for now) -
    /// restoring is a manual file-system operation.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminPolicy")]
    public class MusicMaintenanceController : ControllerBase
    {
        private readonly ILogger<MusicMaintenanceController> _logger;
        private readonly WebFamilyDbContext _context;
        private readonly ApplicationSettings _appSettings;
        private readonly string _mediasDrive;

        public MusicMaintenanceController(
            ILogger<MusicMaintenanceController> logger,
            WebFamilyDbContext context,
            IOptions<ApplicationSettings> appSettings)
        {
            _logger = logger;
            _context = context;
            _appSettings = appSettings?.Value ?? throw new ArgumentNullException(nameof(appSettings));
            _mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
        }

        [HttpPost("RenameFolder")]
        public async Task<IActionResult> RenameFolder([FromBody] RenameFolderRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.NewName))
            {
                return BadRequest("New name is required.");
            }

            var folder = await _context.MediaFolders.SingleOrDefaultAsync(f => f.RecordId == request.FolderId);
            if (folder == null)
            {
                return BadRequest($"Invalid folderId: {request.FolderId}");
            }

            var relativePath = await GetFolderRelativePathAsync(folder);
            var parentRelative = Path.GetDirectoryName(relativePath) ?? string.Empty;

            var nameTaken = await _context.MediaFolders.AnyAsync(f =>
                f.ParentFolderId == folder.ParentFolderId &&
                f.MenuId == folder.MenuId &&
                f.RecordId != folder.RecordId &&
                f.Name == request.NewName);
            if (nameTaken)
            {
                return Conflict($"A folder named '{request.NewName}' already exists here.");
            }

            var fromPath = Path.Combine(_mediasDrive, relativePath);
            var toPath = Path.Combine(_mediasDrive, parentRelative, request.NewName);

            try
            {
                if (!Directory.Exists(fromPath))
                {
                    return NotFound($"Folder not found on disk: {fromPath}");
                }

                Directory.Move(fromPath, toPath);
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(403, "Access denied. Check folder permissions.");
            }
            catch (IOException ex)
            {
                return Conflict($"Folder operation failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An unexpected error occurred while renaming the folder: {ex.Message}");
            }

            folder.Name = request.NewName;
            _context.MediaFolders.Update(folder);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Renamed folder {request.FolderId} to '{request.NewName}'");
            return Ok(new { message = "Folder has been renamed." });
        }

        [HttpPost("RenameTrack")]
        public async Task<IActionResult> RenameTrack([FromBody] RenameTrackRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.NewFileName))
            {
                return BadRequest("New file name is required.");
            }

            var track = await _context.MediaTracks.SingleOrDefaultAsync(t => t.RecordId == request.TrackId);
            if (track == null)
            {
                return BadRequest($"Invalid trackId: {request.TrackId}");
            }

            var folder = await _context.MediaFolders.SingleOrDefaultAsync(f => f.RecordId == track.FolderId);
            if (folder == null)
            {
                return BadRequest("Owning folder not found.");
            }

            var extension = Path.GetExtension(track.FileName);
            var newFileName = $"{request.NewFileName}{extension}";

            var nameTaken = await _context.MediaTracks.AnyAsync(t =>
                t.FolderId == track.FolderId &&
                t.RecordId != track.RecordId &&
                t.FileName == newFileName);
            if (nameTaken)
            {
                return Conflict($"A file named '{newFileName}' already exists here.");
            }

            var relativeFolderPath = await GetFolderRelativePathAsync(folder);
            var fromPath = Path.Combine(_mediasDrive, relativeFolderPath, track.FileName);
            var toPath = Path.Combine(_mediasDrive, relativeFolderPath, newFileName);

            try
            {
                if (!System.IO.File.Exists(fromPath))
                {
                    return NotFound($"File not found on disk: {fromPath}");
                }

                System.IO.File.Move(fromPath, toPath);
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(403, "Access denied. Check file permissions.");
            }
            catch (IOException ex)
            {
                return Conflict($"File operation failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An unexpected error occurred while renaming the file: {ex.Message}");
            }

            track.FileName = newFileName;
            _context.MediaTracks.Update(track);

            // Subtitles are named to match the video's own base name
            // ("{baseName}.{lang}.srt" in a sibling "closecaption" folder -
            // see Helpers/ClosedCaption.cs), so renaming the video without
            // renaming its subtitles the same way would silently break the
            // pairing next time anything reads by convention. Best-effort:
            // a subtitle rename failing here doesn't roll back the (already
            // successful) video rename - the file itself is still fine, just
            // possibly needs a manual fix if this fails.
            var subtitles = await _context.MediaSubtitles
                .Where(s => s.MediaMetaDataRecordId == track.RecordId)
                .ToListAsync();
            if (subtitles.Count > 0)
            {
                var newBaseName = request.NewFileName;
                var ccFolder = Path.Combine(_mediasDrive, relativeFolderPath, "closecaption");

                foreach (var sub in subtitles)
                {
                    try
                    {
                        var subExtension = Path.GetExtension(sub.FileName);
                        var langSuffix = string.IsNullOrEmpty(sub.Language) ? "" : $".{sub.Language}";
                        var newSubFileName = $"{newBaseName}{langSuffix}{subExtension}";
                        var oldSubPath = Path.Combine(ccFolder, sub.FileName);
                        var newSubPath = Path.Combine(ccFolder, newSubFileName);

                        if (System.IO.File.Exists(oldSubPath))
                        {
                            System.IO.File.Move(oldSubPath, newSubPath);
                            sub.FileName = newSubFileName;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not rename subtitle {FileName} alongside track {TrackId}", sub.FileName, track.RecordId);
                    }
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Renamed track {request.TrackId} to '{newFileName}'");
            return Ok(new { message = "File has been renamed." });
        }

        [HttpDelete("Folder/{folderId}")]
        public async Task<IActionResult> DeleteFolder(Guid folderId)
        {
            var folder = await _context.MediaFolders.SingleOrDefaultAsync(f => f.RecordId == folderId);
            if (folder == null)
            {
                return BadRequest($"Invalid folderId: {folderId}");
            }

            var relativePath = await GetFolderRelativePathAsync(folder);
            var parentRelative = Path.GetDirectoryName(relativePath) ?? string.Empty;
            var physicalPath = Path.Combine(_mediasDrive, relativePath);

            try
            {
                if (Directory.Exists(physicalPath))
                {
                    MoveToTrash(physicalPath, parentRelative, folder.Name);
                }
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(403, "Access denied. Check folder permissions.");
            }
            catch (IOException ex)
            {
                return Conflict($"Folder operation failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An unexpected error occurred while deleting the folder: {ex.Message}");
            }

            // The self-referencing ParentFolder FK can't safely cascade at the
            // database level (SQL Server rejects cascade paths on
            // self-references), so nested albums/discs/tracks under this
            // folder have to be removed explicitly, depth-first.
            await DeleteFolderRowsRecursiveAsync(folderId);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Deleted folder {folderId} ('{folder.Name}') - moved to Trash");
            return Ok(new { message = $"'{folder.Name}' has been moved to Trash." });
        }

        [HttpDelete("Track/{trackId}")]
        public async Task<IActionResult> DeleteTrack(Guid trackId)
        {
            var track = await _context.MediaTracks.SingleOrDefaultAsync(t => t.RecordId == trackId);
            if (track == null)
            {
                return BadRequest($"Invalid trackId: {trackId}");
            }

            var folder = await _context.MediaFolders.SingleOrDefaultAsync(f => f.RecordId == track.FolderId);
            if (folder == null)
            {
                return BadRequest("Owning folder not found.");
            }

            var relativeFolderPath = await GetFolderRelativePathAsync(folder);
            var physicalPath = Path.Combine(_mediasDrive, relativeFolderPath, track.FileName);

            try
            {
                if (System.IO.File.Exists(physicalPath))
                {
                    MoveToTrash(physicalPath, relativeFolderPath, track.FileName);
                }
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(403, "Access denied. Check file permissions.");
            }
            catch (IOException ex)
            {
                return Conflict($"File operation failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An unexpected error occurred while deleting the file: {ex.Message}");
            }

            _context.MediaTracks.Remove(track);

            // Same reasoning as ScanAsync's wipe step: MediaSubtitle's FK to
            // MediaTrack is a required, non-nullable column, which isn't
            // something SQL Server allows ON DELETE SET NULL on, and nothing
            // here can assume CASCADE was configured instead - so removed
            // explicitly rather than relying on the database to handle it.
            // Their files move to Trash right alongside the track's own file,
            // not left behind as orphaned files in the closecaption folder.
            var subtitles = await _context.MediaSubtitles
                .Where(s => s.MediaMetaDataRecordId == track.RecordId)
                .ToListAsync();
            if (subtitles.Count > 0)
            {
                var ccFolder = Path.Combine(_mediasDrive, relativeFolderPath, "closecaption");
                var ccRelative = Path.Combine(relativeFolderPath, "closecaption");

                foreach (var sub in subtitles)
                {
                    try
                    {
                        var subPath = Path.Combine(ccFolder, sub.FileName);
                        if (System.IO.File.Exists(subPath))
                        {
                            MoveToTrash(subPath, ccRelative, sub.FileName);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not move subtitle {FileName} to Trash alongside track {TrackId}", sub.FileName, track.RecordId);
                    }
                }

                _context.MediaSubtitles.RemoveRange(subtitles);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Deleted track {trackId} ('{track.FileName}') - moved to Trash");
            return Ok(new { message = $"'{track.FileName}' has been moved to Trash." });
        }

        /// <summary>
        /// Walks a folder up to its top-level ancestor (ParentFolderId ==
        /// null), collecting names on the way, and prefixes the result with
        /// that ancestor's RootPath - the same reconstruction
        /// MediaFolderTreeService uses to build track URLs, just run bottom-up
        /// from one folder instead of top-down over the whole tree.
        /// </summary>
        private async Task<string> GetFolderRelativePathAsync(MediaFolder folder)
        {
            var segments = new List<string> { folder.Name };
            var current = folder;

            while (current.ParentFolderId.HasValue)
            {
                current = await _context.MediaFolders.SingleAsync(f => f.RecordId == current.ParentFolderId.Value);
                segments.Insert(0, current.Name);
            }

            segments.Insert(0, current.RootPath);
            return Path.Combine(segments.ToArray());
        }

        /// <summary>
        /// Removes a folder and everything nested under it (sub-folders and
        /// tracks) from the tracked context. Depth-first, then the direct
        /// tracks, then the folder itself - all committed by the caller's own
        /// SaveChangesAsync.
        /// </summary>
        private async Task DeleteFolderRowsRecursiveAsync(Guid folderId)
        {
            var childFolders = await _context.MediaFolders
                .Where(f => f.ParentFolderId == folderId)
                .ToListAsync();

            foreach (var child in childFolders)
            {
                await DeleteFolderRowsRecursiveAsync(child.RecordId);
            }

            var tracks = await _context.MediaTracks
                .Where(t => t.FolderId == folderId)
                .ToListAsync();
            if (tracks.Count > 0)
            {
                // Files themselves don't need handling here - the whole
                // folder, closecaption subfolder included, already moved to
                // Trash in one Directory.Move before this runs. Just the DB
                // rows need cleaning up, same reasoning as DeleteTrack:
                // MediaSubtitle's FK to MediaTrack can't be assumed to cascade.
                var trackIds = tracks.Select(t => t.RecordId).ToList();
                var subtitles = await _context.MediaSubtitles
                    .Where(s => trackIds.Contains(s.MediaMetaDataRecordId))
                    .ToListAsync();
                if (subtitles.Count > 0)
                {
                    _context.MediaSubtitles.RemoveRange(subtitles);
                }

                _context.MediaTracks.RemoveRange(tracks);
            }

            var folder = await _context.MediaFolders.SingleOrDefaultAsync(f => f.RecordId == folderId);
            if (folder != null)
            {
                _context.MediaFolders.Remove(folder);
            }
        }

        /// <summary>
        /// Moves a file or directory into TrashFolder, mirroring its original
        /// relative location, with a timestamp prefix on its own name so a
        /// second delete of an item with the same name never collides with
        /// (or overwrites) the first.
        /// </summary>
        private void MoveToTrash(string sourcePath, string relativeParentPath, string leafName)
        {
            var trashRoot = string.IsNullOrWhiteSpace(_appSettings.TrashFolder)
                ? Path.Combine(_appSettings.MediaDrive, "_Trash")
                : _appSettings.TrashFolder;

            var destDir = Path.Combine(trashRoot, relativeParentPath ?? string.Empty);
            Directory.CreateDirectory(destDir);

            var timestamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var destPath = Path.Combine(destDir, $"{timestamp}__{leafName}");

            if (Directory.Exists(sourcePath))
            {
                Directory.Move(sourcePath, destPath);
            }
            else
            {
                System.IO.File.Move(sourcePath, destPath);
            }
        }
    }
}
