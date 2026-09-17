using System;
using System.Collections.Generic;
using System.IO;

namespace WebFamily.Server.Helpers;

public class SubtitleFile
{
    public string FileName { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class ClosedCaption
{
    private static readonly HashSet<string> SubtitleExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".vtt", ".srt" };

    // Friendly display names for known language codes. Any code not listed
    // here still works fine - it just falls back to showing the code itself
    // (e.g. "FR") instead of a friendly name.
    private static readonly Dictionary<string, string> LanguageLabels =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["en"] = "English",
            ["km"] = "Khmer"
        };

    /// <summary>
    /// Finds every subtitle file for a video, by scanning its sibling
    /// "closecaption" folder for anything matching
    /// "{videoBaseName}.{language}.{vtt|srt}" - or a bare
    /// "{videoBaseName}.{vtt|srt}" with no language code, which is labeled
    /// generically. A video can have zero, one, or many matches (normally
    /// one per language). This is a directory scan, not a fixed list of
    /// language codes, so any language works automatically.
    /// </summary>
    public List<SubtitleFile> GetAll(string videoFilePath)
    {
        var result = new List<SubtitleFile>();

        var folder = Path.GetDirectoryName(videoFilePath);
        if (string.IsNullOrEmpty(folder)) return result;

        var ccFolder = Path.Combine(folder, "closecaption");
        if (!Directory.Exists(ccFolder)) return result;

        var baseName = Path.GetFileNameWithoutExtension(videoFilePath);

        foreach (var file in Directory.GetFiles(ccFolder, baseName + ".*"))
        {
            var ext = Path.GetExtension(file);
            if (!SubtitleExtensions.Contains(ext)) continue;

            var fileName = Path.GetFileName(file);

            // fileName is "{baseName}.{rest}", where {rest} is either
            // "{lang}{ext}" (e.g. "en.vtt") or just "{ext}" (no language code).
            var rest = fileName.Substring(baseName.Length);
            var language = rest.Length > ext.Length
                ? rest.Substring(1, rest.Length - ext.Length - 1) // strip leading '.' and trailing ext
                : string.Empty;

            var label = string.IsNullOrEmpty(language)
                ? "Captions"
                : (LanguageLabels.TryGetValue(language, out var known) ? known : language.ToUpperInvariant());

            result.Add(new SubtitleFile
            {
                FileName = fileName,
                Language = language,
                Label = label
            });
        }

        return result;
    }
}
