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

    public MetaDataFileInfo(ILogger<MetaDataFileInfo>? logger = null)
    {
        _logger = logger;
    }

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
            if (Path.GetExtension(filePath).Equals(".lnk", StringComparison.OrdinalIgnoreCase)) return null;

            TimeSpan duration = TimeSpan.Zero;
            bool isMp3 = Path.GetExtension(filePath).Equals(".mp3", StringComparison.OrdinalIgnoreCase);

            duration = TryReadDuration(filePath, out bool readable, out var details);

            if (!readable)
            {
                // TagLib couldn't get a duration. Common causes: VBR MP3s with
                // no Xing/VBRI header, or stray junk bytes (e.g. leftover MP4
                // atom fragments) embedded mid-stream from a buggy export tool.
                _logger?.LogWarning("No duration found for {FilePath} ({Details})", filePath, details);

                if (isMp3 && TryRepairMp3(filePath))
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

    /// <summary>
    /// Attempts to repair an MP3 with an unreadable duration by fully
    /// re-encoding it through ffmpeg (input -> temp file -> input). A full
    /// re-encode - not a stream copy - is required, since it's what
    /// discards embedded junk bytes (e.g. stray MP4 atom fragments) that a
    /// stream copy would otherwise preserve. Expects ffmpeg.exe to sit in
    /// the application's root/base directory. Returns true only if the
    /// repaired file was produced and swapped in; the original is left
    /// untouched if anything goes wrong.
    /// </summary>
    private bool TryRepairMp3(string filePath)
    {
        var tempPath = filePath + ".repairing.mp3";
        try
        {
            var ffmpegPath = Path.Combine(AppContext.BaseDirectory, "ffmpeg.exe");
            if (!System.IO.File.Exists(ffmpegPath))
            {
                _logger?.LogWarning("ffmpeg.exe not found at {FfmpegPath}; cannot repair {FilePath}", ffmpegPath, filePath);
                return false;
            }

            var psi = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                ArgumentList =
                {
                    "-y",
                    "-f", "mp3",
                    "-i", filePath,
                    "-map", "0:a:0",
                    "-c:a", "libmp3lame",
                    "-q:a", "2",
                    tempPath
                },
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

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
                _logger?.LogWarning("ffmpeg repair failed for {FilePath} (exit code {ExitCode}): {Error}",
                    filePath, process.ExitCode, stderr);
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
