namespace WebFamily.Server.Helpers
{
    public static class PathExtensions
    {
        // Converts a Windows-style relative path segment (e.g. "musics\rpm")
        // into a web-safe URL segment (e.g. "musics/rpm"). Use this at every
        // point a filesystem-derived path is about to be sent to the client -
        // never send a raw DB/config path value straight through.
        public static string ToWebPath(this string? path)
        {
            if (string.IsNullOrEmpty(path)) return string.Empty;
            return path.Replace('\\', '/').Trim('/');
        }
    }
}
