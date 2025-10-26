using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services;

public interface IUpdateDataBaseServices
{
    Task<List<string>> UpdateMetaData(string menu);
}

public class UpdateDataBaseServices : IUpdateDataBaseServices
{
    private readonly WebFamilyDbContext _context;
    private readonly ApplicationSettings _appSettings;
    private readonly MetaDataFileInfo _metaDataInfo;
    private readonly string _mediasDrive;

    private MenuDataRecord _menuDataRecord = new();
    private readonly List<string> _processResults = new();

    public UpdateDataBaseServices(WebFamilyDbContext context, IOptions<ApplicationSettings> appSettings)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _appSettings = appSettings?.Value ?? throw new ArgumentNullException(nameof(appSettings));
        _metaDataInfo = new WebFamily.Server.Helpers.MetaDataFileInfo();
        _mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
    }

    public async Task<List<string>> UpdateMetaData(string menu)
    {
        _processResults.Clear();

        var folderPaths = GetFolderPaths();

        var result = menu?.ToLowerInvariant() switch
        {
            "photos" => await UpdateMediaAsync(folderPaths.PhotoFolder, EnumMsg.EnumMessageUpdate.Photos.ToString()),
            "rpms" => await UpdateRpmAsync(folderPaths.RpmFolder, folderPaths.RpmCoverFolder),
            "musics" => await UpdateMediaAsync(folderPaths.MusicFolder, EnumMsg.EnumMessageUpdate.Album.ToString()),
            "movies" => await UpdateMediaAsync(folderPaths.MovieFolder, EnumMsg.EnumMessageUpdate.Movies.ToString()),
            "videos" => await UpdateMediaAsync(folderPaths.VideoFolder, EnumMsg.EnumMessageUpdate.Videos.ToString()),
            "books" => await UpdateMediaAsync(folderPaths.BookFolder, EnumMsg.EnumMessageUpdate.Books.ToString()),
            "americansongs" => await UpdateSongAsync(folderPaths.SongFolder),
            "text" => await UpdateTextAsync(folderPaths.TextFolder),
            _ => CreateErrorResult($"Invalid menu parameter: {menu}")
        };

        return result;
    }

    private FolderPaths GetFolderPaths()
    {
        return new FolderPaths
        {
            MovieFolder = Path.Combine(_mediasDrive, _appSettings.AssetMovieFolder!),
            MusicFolder = Path.Combine(_mediasDrive, _appSettings.AssetAlbumFolder!),
            VideoFolder = Path.Combine(_mediasDrive, _appSettings.AssetVideoFolder!),
            BookFolder = Path.Combine(_mediasDrive, _appSettings.AssetBookFolder!),
            SongFolder = Path.Combine(_mediasDrive, _appSettings.AssetEnglishSongFolder!),
            RpmFolder = Path.Combine(_mediasDrive, _appSettings.AssetRpmFolder!),
            RpmCoverFolder = Path.Combine(_mediasDrive, _appSettings.AssetRpmCoverFolder!),
            PhotoFolder = Path.Combine(_mediasDrive, _appSettings.AssetPhotoFolder!),
            TextFolder = Path.Combine(_mediasDrive, _appSettings.AssetTextFolder!)
        };
    }

    public async Task<List<string>> UpdateMediaAsync(string fullPath, string messageType)
    {
        var results = new List<string>();

        if (!Directory.Exists(fullPath))
        {
            results.Add($"Directory not found: {fullPath}");
            return results;
        }

        var folderName = Path.GetFileName(fullPath.TrimEnd(Path.DirectorySeparatorChar));
        var subDirectories = Directory.GetDirectories(fullPath);

        _menuDataRecord.MenuName = folderName;

        if (!await TryGetMenuRecordId(folderName))
        {
            results.Add($"Menu record not found for: {folderName}");
            return results;
        }

        var closedCaptionHelper = new ClosedCaption();

        foreach (var subDirectory in subDirectories)
        {
            var subFolderName = Path.GetFileName(subDirectory.TrimEnd(Path.DirectorySeparatorChar));

            if (!await TryGetDirectoryRecordId(subFolderName))
            {
                continue;
            }

            var hasClosedCaption = Directory.Exists(Path.Combine(subDirectory, "closeCaption"));
            var mediaFiles = _metaDataInfo.SingleLevelDir(subDirectory);

            if (mediaFiles.Count == 0)
                continue;

            try
            {
                await RemoveExistingMediaMetaData(_menuDataRecord.DirectoryRecordId);
                await AddMediaMetaData(mediaFiles, hasClosedCaption, closedCaptionHelper);

                results.Add($"Updated {mediaFiles.Count} files in {subFolderName}");
            }
            catch (Exception ex)
            {
                var errorMessage = $"SQL update error for {subFolderName}: {ex.Message}";
                results.Add(errorMessage);
                throw new ApplicationException(errorMessage, ex);
            }
        }

        results.Add($"Process Complete: {EnumMsg.Get(messageType)}");
        return results;
    }

    public async Task<List<string>> UpdateSongAsync(string fullPath)
    {
        var results = new List<string>();

        if (!Directory.Exists(fullPath))
        {
            results.Add($"Directory not found: {fullPath}");
            return results;
        }

        var folderName = Path.GetFileName(fullPath.TrimEnd(Path.DirectorySeparatorChar));
        var directoryRecord = await TryGetDirectoryRecord(folderName);

        if (directoryRecord == null)
        {
            results.Add($"Folder not processed: {folderName} (Directory record not found)");
            return results;
        }

        var songFiles = _metaDataInfo.MultipleLevelDir(fullPath);

        if (songFiles.Count == 0)
        {
            results.Add("No files found to process");
            return results;
        }

        try
        {
            await RemoveExistingMediaMetaData(directoryRecord.RecordId);

            foreach (var songFile in songFiles)
            {
                var relativePath = GetRelativePathFromBase(fullPath, songFile.FullPath, songFile.FullFileName);
                var metaData = CreateMediaMetaData(directoryRecord.RecordId, songFile, relativePath);
                _context.MediaMetaData.Add(metaData);
            }

            await _context.SaveChangesAsync();
            results.Add($"Updated {songFiles.Count} song files");
        }
        catch (Exception ex)
        {
            var errorMessage = $"Update Database Error: {ex.Message}";
            results.Add(errorMessage);
            throw new ApplicationException(errorMessage, ex);
        }

        results.Add($"Complete process: {EnumMsg.EnumMessageUpdate.EnglishSong}");
        return results;
    }

    public async Task<List<string>> UpdateRpmAsync(string rpmPath, string coverPath)
    {
        var results = new List<string>();

        if (!Directory.Exists(rpmPath) || !Directory.Exists(coverPath))
        {
            results.Add("RPM or cover directory not found");
            return results;
        }

        try
        {
            // Remove all existing RPM records
            var existingRpms = await _context.Rpms.ToListAsync();
            _context.Rpms.RemoveRange(existingRpms);
            await _context.SaveChangesAsync();

            var mimeTypeHelper = new MimeType();
            var coverFiles = Directory.EnumerateFiles(coverPath, "*.*")
                                   .OrderBy(filename => filename)
                                   .ToList();

            foreach (var coverFile in coverFiles)
            {
                var albumName = Path.GetFileNameWithoutExtension(coverFile);
                var albumPath = Path.Combine(rpmPath, albumName);

                if (!Directory.Exists(albumPath))
                {
                    results.Add($"Album directory not found: {albumName}");
                    continue;
                }

                var trackList = _metaDataInfo.SingleLevelDir(albumPath);
                var rpm = CreateRpmRecord(coverFile, mimeTypeHelper, trackList);

                _context.Rpms.Add(rpm);
                await _context.SaveChangesAsync();

                results.Add($"Processed album: {albumName} with {trackList.Count} tracks");
            }
        }
        catch (Exception ex)
        {
            var errorMessage = $"Error processing RPMs: {ex.Message}";
            results.Add(errorMessage);
            throw new ApplicationException(errorMessage, ex);
        }

        results.Add($"Process Complete: {EnumMsg.Get(EnumMsg.EnumMessageUpdate.Rpm.ToString())}");
        return results;
    }

    public async Task<List<string>> UpdateTextAsync(string fullPath)
    {
        var results = new List<string>();

        if (!Directory.Exists(fullPath))
        {
            results.Add($"Directory not found: {fullPath}");
            return results;
        }

        var folderName = Path.GetFileName(fullPath.TrimEnd(Path.DirectorySeparatorChar));
        var directoryRecord = await TryGetDirectoryRecord(folderName);

        if (directoryRecord == null)
        {
            results.Add($"Folder not processed: {folderName} (Directory record not found)");
            return results;
        }

        var textFiles = _metaDataInfo.MultipleLevelDir(fullPath);

        if (textFiles.Count == 0)
        {
            results.Add("No files found to process");
            return results;
        }

        try
        {
            await RemoveExistingMediaMetaData(directoryRecord.RecordId);

            foreach (var textFile in textFiles)
            {
                var relativePath = GetRelativePathFromBase(fullPath, textFile.FullPath, textFile.FullFileName);
                var metaData = CreateMediaMetaData(directoryRecord.RecordId, textFile, relativePath);
                _context.MediaMetaData.Add(metaData);
            }

            await _context.SaveChangesAsync();
            results.Add($"Updated {textFiles.Count} text files");
        }
        catch (Exception ex)
        {
            var errorMessage = $"Update Database Error: {ex.Message}";
            results.Add(errorMessage);
            throw new ApplicationException(errorMessage, ex);
        }

        results.Add($"Complete process: {EnumMsg.EnumMessageUpdate.TextFiles}");
        return results;
    }

    // Helper Methods
    private async Task<bool> TryGetMenuRecordId(string menuName)
    {
        try
        {
            var record = await _context.MediaMenus.SingleAsync(x => x.Menu == menuName);
            _menuDataRecord.MenuName = record.Menu;
            _menuDataRecord.MenuRecordId = record.RecordId;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<bool> TryGetDirectoryRecordId(string directoryName)
    {
        var exists = await _context.MediaDirectories
            .AnyAsync(x => x.Directory == directoryName && x.MenuId == _menuDataRecord.MenuRecordId);

        if (!exists)
        {
            _processResults.Add($"Not Process Folder: {directoryName}. It does not exist in MediaDirectory table");
            return false;
        }

        var record = await _context.MediaDirectories
            .SingleAsync(x => x.Directory == directoryName && x.MenuId == _menuDataRecord.MenuRecordId);

        _menuDataRecord.DirectoryRecordId = record.RecordId;
        _menuDataRecord.DirectoryName = record.Directory;
        return true;
    }

    private async Task<MediaDirectory> TryGetDirectoryRecord(string directoryName)
    {
        try
        {
            return await _context.MediaDirectories.SingleAsync(e => e.Directory == directoryName);
        }
        catch
        {
            return null;
        }
    }

    private async Task RemoveExistingMediaMetaData(Guid directoryId)
    {
        var existingRecords = await _context.MediaMetaData
            .Where(x => x.DirectoryId == directoryId)
            .ToListAsync();

        _context.MediaMetaData.RemoveRange(existingRecords);
        await _context.SaveChangesAsync();
    }

    private async Task AddMediaMetaData(List<MetaDataInfo> mediaFiles, bool hasClosedCaption, ClosedCaption closedCaptionHelper)
    {
        foreach (var mediaFile in mediaFiles)
        {
            var metaData = new MediaMetaDatum
            {
                DirectoryId = _menuDataRecord.DirectoryRecordId,
                RecordId = Guid.NewGuid(),
                Type = mediaFile.MimeType,
                Title = mediaFile.FullFileName,
                Duration = mediaFile.Duration.ToString(@"hh\:mm\:ss"),
                Caption = hasClosedCaption
                    ? closedCaptionHelper.Get(Path.Combine(mediaFile.FullPath, mediaFile.FullFileName))
                    : string.Empty
            };

            _context.Add(metaData);
        }

        await _context.SaveChangesAsync();
    }

    private static MediaMetaDatum CreateMediaMetaData(Guid directoryId, MetaDataInfo fileInfo, string title)
    {
        return new MediaMetaDatum
        {
            DirectoryId = directoryId,
            RecordId = Guid.NewGuid(),
            Type = fileInfo.MimeType,
            Title = title,
            Duration = fileInfo.Duration.ToString(@"hh\:mm\:ss"),
            Caption = string.Empty
        };
    }

    private static Rpm CreateRpmRecord(string coverFile, MimeType mimeTypeHelper, List<MetaDataInfo> trackList)
    {
        var rpm = new Rpm
        {
            RecordId = Guid.NewGuid(),
            Title = Path.GetFileName(coverFile),
            Type = mimeTypeHelper.Get(coverFile)
        };

        var rpmTracks = trackList.Select(track => new RpmTrack
        {
            RecordId = Guid.NewGuid(),
            RpmId = rpm.RecordId,
            Title = track.FullFileName,
            Duration = track.Duration.ToString(@"hh\:mm\:ss")
        }).ToList();

        if (trackList.Count > 0)
        {
            rpm.AudioType = trackList.First().MimeType;
        }

        rpm.RpmTracks = rpmTracks;
        return rpm;
    }

    private static string GetRelativePathFromBase(string basePath, string fullPath, string fileName)
    {
        var completePath = Path.Combine(fullPath, fileName);
        return completePath.Length > basePath.Length + 1
            ? completePath.Substring(basePath.Length + 1)
            : completePath;
    }

    private static List<string> CreateErrorResult(string errorMessage)
    {
        return new List<string> { errorMessage };
    }

    // Helper class for organizing folder paths
    private class FolderPaths
    {
        public string MovieFolder { get; set; } = string.Empty;
        public string MusicFolder { get; set; } = string.Empty;
        public string VideoFolder { get; set; } = string.Empty;
        public string BookFolder { get; set; } = string.Empty;
        public string SongFolder { get; set; } = string.Empty;
        public string RpmFolder { get; set; } = string.Empty;
        public string RpmCoverFolder { get; set; } = string.Empty;
        public string PhotoFolder { get; set; } = string.Empty;
        public string TextFolder { get; set; } = string.Empty;
    }
}