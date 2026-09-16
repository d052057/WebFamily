using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace WebFamily.Server.Helpers;

public interface IMetaDataFileInfo
{
    List<Models.MetaDataInfo> SingleLevelDir(string folder);
    List<Models.MetaDataInfo> MultipleLevelDir(string folder);
}

public class MetaDataFileInfo : IMetaDataFileInfo
{
    private readonly MimeType _mimeTypeObj = new();
    private readonly ILogger<MetaDataFileInfo>? _logger;

    // Only characters with special meaning in a URL - NOT a whitelist, so
    // foreign-language characters (Thai, Khmer, etc.) are left completely
    // untouched. Extend this set if another problem character turns up.
    private static readonly char[] UrlUnsafeChars = { '+', '%', '#', '&', '=', ';' };

    // Exact file names commonly injected into folders by Windows (or other
    // tools) that are never real media/document content. Case-insensitive.
    private static readonly HashSet<string> JunkFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "thumbs.db",           // Windows thumbnail cache
        "ehthumbs.db",         // Windows Media Center thumbnail cache
        "ehthumbs_vista.db",
        "desktop.ini",         // Windows folder customization
        ".ds_store"            // macOS equivalent, in case content ever came from a Mac
    };

    // Extensions that are never real media/document content, regardless of
    // the file name. Add to this list as new junk types turn up.
    private static readonly HashSet<string> JunkExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".ini",
        ".db",
        ".tmp",
        ".bak",
        ".lnk"                 // shortcuts - previously checked separately in ProcessFile
    };

    /// <summary>
    /// True for OS/tool-injected junk that should never be scanned as media:
    /// known system file names (Thumbs.db, desktop.ini, ...), known junk
    /// extensions (.ini, .db, .tmp, .bak, .lnk), and Office lock files
    /// (~$Document.docx).
    /// </summary>
    private static bool IsJunkFile(string filePath)
    {
        var fileName = Path.GetFileName(filePath);
        if (JunkFileNames.Contains(fileName)) return true;
        if (JunkExtensions.Contains(Path.GetExtension(filePath))) return true;
        if (fileName.StartsWith("~$")) return true; // Office lock files
        return false;
    }

    public MetaDataFileInfo(ILogger<MetaDataFileInfo>? logger = null)
    {
        _logger = logger;
    }

    /// <summary>
    /// If filePath's file name contains any URL-unsafe character, renames the
    /// file on disk (replacing only those characters with '_') and returns
    /// the new path. Leaves the file and path untouched, and never throws,
    /// if nothing needs changing or the rename can't be done.
    /// </summary>
    private string SanitizeFileName(string filePath)
    {
        var fileName = Path.GetFileName(filePath);
        if (fileName.IndexOfAny(UrlUnsafeChars) < 0) return filePath;

        var directory = Path.GetDirectoryName(filePath) ?? string.Empty;
        var sanitizedName = new string(fileName.Select(c => UrlUnsafeChars.Contains(c) ? '_' : c).ToArray());

        var newPath = Path.Combine(directory, sanitizedName);

        // Avoid clobbering an existing file with the same sanitized name.
        int suffix = 1;
        while (System.IO.File.Exists(newPath) && !string.Equals(newPath, filePath, StringComparison.OrdinalIgnoreCase))
        {
            var nameOnly = Path.GetFileNameWithoutExtension(sanitizedName);
            var ext = Path.GetExtension(sanitizedName);
            newPath = Path.Combine(directory, $"{nameOnly}_{suffix}{ext}");
            suffix++;
        }

        try
        {
            System.IO.File.Move(filePath, newPath);
            _logger?.LogInformation("Renamed {OldName} to {NewName} (URL-unsafe characters)", fileName, Path.GetFileName(newPath));
            return newPath;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Could not rename {FilePath}; leaving as-is", filePath);
            return filePath;
        }
    }

    public List<Models.MetaDataInfo> SingleLevelDir(string folder)
    {
        var list = new List<Models.MetaDataInfo>();
        if (!Directory.Exists(folder)) return list;

        // Get only files in the immediate directory
        var files = Directory.GetFiles(folder);
        var currentFolder = Path.GetFileName(folder.TrimEnd(Path.DirectorySeparatorChar));

        foreach (var rawFilePath in files)
        {
            if (IsJunkFile(rawFilePath)) continue;
            var filePath = SanitizeFileName(rawFilePath);
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

        foreach (var rawFilePath in files)
        {
            if (IsJunkFile(rawFilePath)) continue;
            var filePath = SanitizeFileName(rawFilePath);
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
            var extension = Path.GetExtension(filePath);
            bool isRepairable = RepairableTypes.ContainsKey(extension);

            duration = TryReadDuration(filePath, out bool readable, out var details);

            if (!readable)
            {
                // TagLib couldn't get a duration. Common causes: VBR MP3s with
                // no Xing/VBRI header, a corrupt FLAC STREAMINFO block, or a
                // missing/incomplete Cues index in an MKV/WebM (e.g. from an
                // interrupted recording).
                _logger?.LogWarning("No duration found for {FilePath} ({Details})", filePath, details);

                if (isRepairable && TryRepairMedia(filePath, extension))
                {
                    // Repair replaced the file in place - read it fresh, once.
                    duration = TryReadDuration(filePath, out readable, out _);
                    if (readable)
                    {
                        _logger?.LogInformation("Repaired {FilePath}, duration now {Duration}", filePath, duration);
                    }
                    else
                    {
                        _logger?.LogWarning("Repair ran for {FilePath} but duration is still unreadable", filePath);
                    }
                }
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

    private TimeSpan TryReadDuration(string filePath, out bool readable, out string details)
    {
        // Only audio/video files have a meaningful "duration" - skip everything
        // else (pdf, txt, images, etc.) before ever touching TagLib, since
        // TagLib can throw or behave unpredictably on non-media files.
        var mimeType = _mimeTypeObj.Get(filePath);
        bool isAudioOrVideo = mimeType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)
                            || mimeType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);

        if (!isAudioOrVideo)
        {
            readable = false;
            details = $"skipped: not audio/video ({mimeType})";
            return TimeSpan.Zero;
        }

        try
        {
            using var tlFile = TagLib.File.Create(filePath);
            var codecs = tlFile.Properties == null
                ? "none"
                : string.Join(", ", tlFile.Properties.Codecs.Select(c => c.Description));

            if (tlFile.Properties != null && tlFile.Properties.Duration != TimeSpan.Zero)
            {
                readable = true;
                details = codecs;
                return tlFile.Properties.Duration;
            }

            readable = false;
            details = codecs;
            return TimeSpan.Zero;
        }
        catch (Exception ex)
        {
            // Not a readable media type (e.g. txt, pdf), or the file itself is
            // corrupt/truncated/has a malformed tag.
            readable = false;
            details = $"{ex.GetType().Name}: {ex.Message}";
            return TimeSpan.Zero;
        }
    }

    private enum RepairStrategy
    {
        // Rewrite the audio/video streams from scratch. Correct fix when the
        // stream data itself (or its embedded metadata) is corrupt - e.g. a
        // VBR MP3 missing its Xing/VBRI header, or a FLAC with a damaged
        // STREAMINFO block.
        ReEncode,

        // Rewrite only the container (index/headers), leaving every
        // audio/video sample byte-for-byte untouched. Correct fix when the
        // problem is a missing/incomplete index - e.g. a Matroska/WebM file
        // left without a proper Cues element after an interrupted recording.
        // Far cheaper than a re-encode, and lossless by definition.
        Remux
    }

    // Extension -> repair configuration. AudioCodec is only used for
    // ReEncode; Remux always uses stream copy regardless of codec.
    private static readonly Dictionary<string, (RepairStrategy Strategy, string InputFormat, string? AudioCodec)> RepairableTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [".mp3"]  = (RepairStrategy.ReEncode, "mp3",      "libmp3lame"),
            [".flac"] = (RepairStrategy.ReEncode, "flac",     "flac"),        // lossless in, lossless out - never downgrade to a lossy codec
            [".mkv"]  = (RepairStrategy.Remux,    "matroska", null),
            [".webm"] = (RepairStrategy.Remux,    "webm",     null)
        };

    /// <summary>
    /// Repairs a media file with an unreadable duration, using the strategy
    /// appropriate to its format (see RepairableTypes / RepairStrategy).
    /// Expects ffmpeg.exe to sit in the application's root/base directory.
    /// Returns true only if the repaired file was produced and swapped in;
    /// the original is left untouched if anything goes wrong.
    /// </summary>
    private bool TryRepairMedia(string filePath, string extension)
    {
        if (!RepairableTypes.TryGetValue(extension, out var config))
        {
            return false;
        }

        var tempPath = filePath + ".repairing" + extension;
        try
        {
            var ffmpegPath = Path.Combine(AppContext.BaseDirectory, "ffmpeg.exe");
            if (!System.IO.File.Exists(ffmpegPath))
            {
                _logger?.LogWarning("ffmpeg.exe not found at {FfmpegPath}; cannot repair {FilePath}", ffmpegPath, filePath);
                return false;
            }

            var argumentList = new List<string> { "-y", "-f", config.InputFormat, "-i", filePath };

            if (config.Strategy == RepairStrategy.Remux)
            {
                argumentList.AddRange(new[] { "-map", "0", "-c", "copy" });
            }
            else
            {
                argumentList.AddRange(new[] { "-map", "0:a:0", "-c:a", config.AudioCodec! });
                if (config.AudioCodec == "libmp3lame")
                {
                    argumentList.AddRange(new[] { "-q:a", "2" });
                }
            }

            argumentList.Add(tempPath);

            var psi = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            foreach (var arg in argumentList) psi.ArgumentList.Add(arg);

            using var process = Process.Start(psi);
            if (process == null)
            {
                _logger?.LogWarning("Could not start ffmpeg for {FilePath}", filePath);
                return false;
            }

            string stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (process.ExitCode != 0 || !System.IO.File.Exists(tempPath) || new FileInfo(tempPath).Length == 0)
            {
                _logger?.LogWarning("ffmpeg repair ({Strategy}) failed for {FilePath} (exit code {ExitCode}): {Error}",
                    config.Strategy, filePath, process.ExitCode, stderr);
                SafeDelete(tempPath);
                return false;
            }

            // input -> temp -> input: swap the repaired copy into place.
            System.IO.File.Move(tempPath, filePath, overwrite: true);
            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Unexpected error repairing {FilePath}", filePath);
            SafeDelete(tempPath);
            return false;
        }
    }

    private static void SafeDelete(string path)
    {
        try
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }
        catch
        {
            // best-effort cleanup only
        }
    }
}
