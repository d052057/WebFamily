using WebFamily.Models;
using Microsoft.Extensions.Options;
using WebFamily.Helpers;
using WebFamily.Services;
using System.Collections.Generic;
using System.IO;

namespace WebFamily.Services;
public interface IUpdateDataBaseServices
{
    List<string> UpdateMetaData(string menu);
}
public class UpdateDataBaseServices : IUpdateDataBaseServices

{
    private readonly WebFamilyDbContext _context;
    private readonly string MEDIAS_DRIVE;
    private readonly IOptions<ApplicationSettings> _appSettings;
    private readonly IRpmServices _rpmServices;

    public UpdateDataBaseServices(
        WebFamilyDbContext context,
        IOptions<ApplicationSettings> appSettings,
        IRpmServices rpmServices
        )
    {
        _context = context;
        _appSettings = appSettings;
        MEDIAS_DRIVE = appSettings.Value.MediaDrive + @"\";
        _rpmServices = rpmServices;
    }
    public List<string> UpdateMetaData(string menu)
    {
        Helpers.UpdateMedias Obj = new(_context);
        List<string> result = [];
        string movieFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetMovieFolder!);
        string musicFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetAlbumFolder!);
        string videoFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetVideoFolder!);
        string bookFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetBookFolder!);
        string songFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetEnglishSongFolder!);
        string rpmFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetRpmFolder!);
        string rpmCoverFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetRpmCoverFolder!);
        string photoFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetPhotoFolder!);
        string textFolder = Path.Combine(MEDIAS_DRIVE, _appSettings.Value.AssetTextFolder!);
        switch (menu)
        {
            case "photos":
                 result = Obj.Update(photoFolder, EnumMsg.EnumMessageUpdate.Photos.ToString());
                break;
            case "rpms":
                Helpers.UpdateRPM rpm = new(_context);
                result = rpm.Update(
                    rpmFolder,
                    rpmCoverFolder
                    );
                break;
            case "musics":
                result = Obj.Update(musicFolder, EnumMsg.EnumMessageUpdate.Album.ToString());
                break;
            case "movies":
                result = Obj.Update(movieFolder, EnumMsg.EnumMessageUpdate.Movies.ToString());
                break;
            case "videos":
                result = Obj.Update(videoFolder, EnumMsg.EnumMessageUpdate.Videos.ToString());
                break;
            case "books":
                result = Obj.Update(bookFolder, EnumMsg.EnumMessageUpdate.Books.ToString()); 
                break;
            case "americansongs":
                Helpers.UpdateSongs songs = new(_context);
                result = songs.Update(
                     songFolder
                    );
                break;
            case "text":
                Helpers.UpdateText TextObj = new(_context);
                result = TextObj.Update(
                     textFolder
                    );
                break;
            default:
                result.Add( "invalid menu parameter " + menu);
                break;
        }
        return result;
    }

}

