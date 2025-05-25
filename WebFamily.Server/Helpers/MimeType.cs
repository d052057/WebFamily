using Microsoft.AspNetCore.StaticFiles;
//using System.IO;

namespace WebFamily.Helpers;
public class MimeType
{
    public string Get(string file)
    {
        var provider = new FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(file, out string mimeType))
        {
            mimeType = "application/octet-stream";
        }
        switch (Path.GetExtension(file).ToLower())
        {
            case ".flac":
                mimeType = "audio/flac";
                break;
            case ".mkv":
                mimeType = "video/mp4";
                break;
            case ".mov":
                mimeType = "video/mp4";
                break;
        }
        return mimeType;
    }
}
