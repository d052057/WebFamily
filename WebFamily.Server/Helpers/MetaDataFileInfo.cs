using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace WebFamily.Server.Helpers;

public interface IMetaDataFileInfo
{
    List<Models.MetaDataInfo> SingleLevelDir(string folder);
    List<Models.MetaDataInfo> MultipleLevelDir(string folder);
}

public class MetaDataFileInfo : IMetaDataFileInfo
{
    private readonly MimeType _mimeTypeObj = new();

    public List<Models.MetaDataInfo> SingleLevelDir(string folder)
    {
        var list = new List<Models.MetaDataInfo>();
        if (!Directory.Exists(folder)) return list;

        // Get only files in the immediate directory
        var files = Directory.GetFiles(folder);
        var currentFolder = Path.GetFileName(folder.TrimEnd(Path.DirectorySeparatorChar));

        foreach (var filePath in files)
        {
            var md = ProcessFile(filePath, currentFolder);
            if (md != null) list.Add(md);
        }

        return list;
    }

    public List<Models.MetaDataInfo> MultipleLevelDir(string folder)
    {
        var list = new List<Models.MetaDataInfo>();
        if (!Directory.Exists(folder)) return list;

        // SearchOption.AllDirectories handles recursion natively and cleanly
        var files = Directory.GetFiles(folder, "*.*", SearchOption.AllDirectories);

        foreach (var filePath in files)
        {
            var fileFolder = Path.GetDirectoryName(filePath) ?? folder;
            var md = ProcessFile(filePath, fileFolder);
            if (md != null) list.Add(md);
        }

        return list;
    }

    private Models.MetaDataInfo? ProcessFile(string filePath, string folderLocation)
    {
        try
        {
            // Skip symbolic links/shortcuts if needed
            var fileInfo = new FileInfo(filePath);
            if (fileInfo.Attributes.HasFlag(FileAttributes.ReparsePoint)) return null;

            TimeSpan duration = TimeSpan.Zero;

            // Use TagLibSharp to extract the media duration safely
            try
            {
                using var tlFile = TagLib.File.Create(filePath);
                if (tlFile.Properties != null && tlFile.Properties.Duration != TimeSpan.Zero)
                {
                    duration = tlFile.Properties.Duration;
                }
            }
            catch
            {
                // Fallback if the file is not a readable media type (e.g. txt, pdf)
                duration = TimeSpan.Zero;
            }

            return new Models.MetaDataInfo
            {
                Duration = duration.Duration(),
                FullFileName = Path.GetFileName(filePath),
                FullPath = folderLocation,
                MimeType = _mimeTypeObj.Get(filePath)
            };
        }
        catch
        {
            // Prevent one corrupt file from crashing the entire directory sweep
            return null;
        }
    }
}
