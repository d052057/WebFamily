namespace WebFamily.Server.Helpers;

//public class AppFolderSettings
//{
//    public ApplicationSettings? ApplicationSettings { get; set; }

//}
public class ApplicationSettings
{
    // The URL path prefix static media files are served under (see
    // Program.cs's ConfigureMediaFiles). This is a fixed routing constant,
    // NOT tied to MediaDrive - it doesn't change if the physical drive does.
    public const string MediaRequestPath = "/medias";

    public string Download { get; set; }
    public string ClientURL { get; set; }
    public string MediaDrive { get; set; } = @"c:\medias";
    public string ApiKey { get; set; }
    public string AssetAlbumFolder { get; set; }
    public string AssetVideoFolder { get; set; }
    public string AssetMovieFolder { get; set; }
    public string AssetBookFolder { get; set; }
    public string AssetPhotoFolder { get; set; }
    public string AssetEnglishSongFolder { get; set; }
    public string AssetRpmFolder { get; set; }
    public string AssetRpmCoverFolder { get; set; }
    public string AssetCCFolder { get; set; }

    public string AssetTextFolder { get; set; }
    public string GetUrlYoutube()
    {
        return "https://www.googleapis.com/youtube/v3/playlistItems?key=" + ApiKey + "&part=snippet&maxResults=12&playlistId=";
    }
}
