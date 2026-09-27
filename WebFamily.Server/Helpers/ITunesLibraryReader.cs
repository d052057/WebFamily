using System.Xml;
using System.Xml.Linq;

namespace WebFamily.Server.Helpers;

/// <summary>
/// Reads the subset of an iTunes "Library.xml" export (an Apple property
/// list / plist file) that ArtistLookupService actually needs: each track's
/// Album, Name and Artist string fields. Not a general-purpose plist parser -
/// plist values can be strings, integers, dates, booleans, nested
/// arrays/dicts, etc., but Album/Name/Artist are always plain &lt;string&gt;
/// elements in this export, so a full type-aware parser isn't needed.
///
/// Plist XML's key/value pairs are POSITIONAL siblings, not nested or
/// attributed: &lt;key&gt;Name&lt;/key&gt;&lt;string&gt;Some Song&lt;/string&gt;
/// - the value is simply whichever element immediately follows the
/// &lt;key&gt;. This walks every dict that way rather than assuming any
/// particular XML shape beyond that convention.
/// </summary>
public static class ITunesLibraryReader
{
    public readonly struct TrackInfo
    {
        public string? Album { get; init; }
        public string? Name { get; init; }
        public string? Artist { get; init; }
    }

    /// <summary>
    /// Returns one TrackInfo per track dict found under the top-level
    /// "Tracks" key. Tracks missing Album or Name are still returned - this
    /// only parses, it's up to the caller to decide what counts (matching
    /// how the old Python converter split "parse" from "what to skip").
    /// </summary>
    public static List<TrackInfo> ReadTracks(string filePath)
    {
        // DtdProcessing must be explicitly allowed: iTunes' plist XML
        // declares a DOCTYPE referencing an external DTD hosted at
        // apple.com, and .NET's XML reader prohibits DOCTYPEs by default
        // (throws immediately) unless told otherwise. Ignore rather than
        // Parse - the DTD itself is never actually needed to read the
        // string values below, and XmlResolver = null additionally
        // guarantees no network fetch is ever attempted for it.
        var settings = new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Ignore,
            XmlResolver = null
        };

        using var reader = XmlReader.Create(filePath, settings);
        var doc = XDocument.Load(reader);

        var rootDict = doc.Root?.Element("dict");
        var tracksDict = FindValueDict(rootDict, "Tracks");
        if (tracksDict == null)
        {
            return new List<TrackInfo>();
        }

        var results = new List<TrackInfo>();

        // tracksDict's own children are (key = numeric track id, value =
        // track dict) pairs - only the dict values matter, the id keys don't.
        var children = tracksDict.Elements().ToList();
        for (var i = 1; i < children.Count; i += 2)
        {
            if (children[i].Name.LocalName != "dict") continue;

            string? album = null, name = null, artist = null;

            var fields = children[i].Elements().ToList();
            for (var j = 0; j + 1 < fields.Count; j += 2)
            {
                if (fields[j].Name.LocalName != "key") continue;

                var value = fields[j + 1].Value;
                switch (fields[j].Value)
                {
                    case "Album": album = value; break;
                    case "Name": name = value + ".wav"; break;
                    case "Artist": artist = value; break;
                }
            }

            results.Add(new TrackInfo { Album = album, Name = name, Artist = artist });
        }

        return results;
    }

    /// <summary>
    /// Given a dict element, finds &lt;key&gt;keyName&lt;/key&gt; among its
    /// direct children and returns the &lt;dict&gt; that immediately follows
    /// it (plist's key-then-value sibling convention).
    /// </summary>
    private static XElement? FindValueDict(XElement? dict, string keyName)
    {
        if (dict == null) return null;

        var children = dict.Elements().ToList();
        for (var i = 0; i + 1 < children.Count; i += 2)
        {
            if (children[i].Name.LocalName == "key" && children[i].Value == keyName)
            {
                return children[i + 1].Name.LocalName == "dict" ? children[i + 1] : null;
            }
        }

        return null;
    }
}
