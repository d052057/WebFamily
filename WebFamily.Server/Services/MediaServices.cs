
using Microsoft.EntityFrameworkCore;
using WebFamily.Server.Models;
namespace WebFamily.Server.Services;
public interface IMediaServices
{
    Task<MediaDirectory> GetFilesByFolder(string folder, string menu);
    Task<IEnumerable<MediaDirectory>> GetDirectoryList(Guid id);
    Task<IEnumerable<MediaDirectory>> DirectoryIndex();
    Task<IEnumerable<AmericanMusicsDirectoryView>> GetRockDirectory();
    Task<IEnumerable<AmericanMusicsView>> GetRockSong(string Folder);
    IEnumerable<MediaMetaDatum> Index();
    Task<MediaDirectory> GetMediaDirectory(Guid id);
    MediaMetaDatum GetById(Guid id);
}
public class MediaServices : IMediaServices
{
    private readonly WebFamilyDbContext _context;

    public MediaServices(WebFamilyDbContext context)
    {
        _context = context;
    }

    public async Task<MediaDirectory> GetFilesByFolder(string folder, string menu)
    {
        MediaDirectory Record = new();
        MediaMenu MenuRecord = new();
        try
        {
            MenuRecord = await _context.MediaMenus.SingleAsync(i => i.Menu == menu);
            if (MenuRecord is not null)
            {

                Record = await _context.MediaDirectories
                .Where(m => (m.Directory == folder && m.MenuId == MenuRecord.RecordId))
                    .Include(p => p.MediaMetaData.OrderBy(o => o.Title))
                    .FirstAsync();
            }
        }
        catch (Exception ex)
        {
            throw new ApplicationException($"Failed to get files for folder '{folder}' in menu '{menu}'.", ex);
        }
        return Record;
    }
    public async Task<IEnumerable<AmericanMusicsDirectoryView>> GetRockDirectory()
    {
        return await _context.AmericanMusicsDirectoryViews.ToListAsync();
    }
    public async Task<IEnumerable<AmericanMusicsView>> GetRockSong(string Folder)
    {
        return await _context.AmericanMusicsViews
            .Where(d => d.Directory == Folder)
            .ToListAsync();
    }
    public async Task<IEnumerable<MediaDirectory>> GetDirectoryList(Guid id)
    {
        return await _context.MediaDirectories.Where(d => d.MenuId == id).ToListAsync();

    }
    public MediaMetaDatum GetById(Guid Id)
    {

        var record = _context.MediaMetaData.Find(Id);
        if (record is null)
        {
            throw new KeyNotFoundException($"Media item with ID '{Id}' not found");
        }
        return record;
    }
    public async Task<IEnumerable<MediaDirectory>> DirectoryIndex()
    {
        return await _context.MediaDirectories.ToListAsync();

    }
    public IEnumerable<MediaMetaDatum> Index()
    {
        return _context.MediaMetaData
            .ToList()
            .ToArray();
    }
    public async Task<MediaDirectory> GetMediaDirectory(Guid id)
    {
        MediaDirectory Record = new();
        try
        {
            Record = await _context.MediaDirectories.SingleAsync(i => i.RecordId == id);
        }
        catch (Exception ex)
        {
            throw new ApplicationException($"Failed to get media directory with ID '{id}'.", ex);
        }
        return Record;
    }
}
