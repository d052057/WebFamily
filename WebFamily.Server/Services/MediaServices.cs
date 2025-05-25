namespace WebFamily.Services;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Models;
using Newtonsoft.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;
using WebFamily.Helpers;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using Microsoft.Extensions.Hosting;
using System.IO;
using System.Linq;
using Shell32;

public interface IMediaServices
{
    Task<MediaDirectory> GetFilesByFolder(string folder, string menu);
    Task<IEnumerable<MediaMenu>> GetMenuList();
    Task<IEnumerable<MediaDirectory>> GetDirectoryList(Guid id);
    Task<IEnumerable<VideosView>> GetVideosView();
    Task<IEnumerable<MoviesView>> GetMoviesView();
    Task<IEnumerable<MusicsView>> GetMusicsView();

    JsonResult RemoveMediaDirectory(Guid id);
    JsonResult AddMediaDirectory(JsonMenu folder);
    JsonResult AddLink(MenuRecord folder);
    JsonResult RenameMediafile(RenameFile record);
    JsonResult RemoveLink(string urllnk);


    Task<IEnumerable<MediaDirectory>> DirectoryIndex();
    Task<IEnumerable<AmericanMusicsDirectoryView>> GetRockDirectory();
    Task<IEnumerable<AmericanMusicsView>> GetRockSong(string Folder);
    IEnumerable<MediaMetaDatum> Index();
    Task<MediaDirectory> GetMediaDirectory(Guid id);

    JsonResult DeleteById(Guid id);
    MediaMetaDatum GetById(Guid id);
    Task<MediaView> UpdateMediasDuration(Guid recordId, string duration);
}
public class MediaServices : IMediaServices
{
    private readonly WebFamilyDbContext _context;
    private readonly IOptions<ApplicationSettings> _appSettings;
    string JSON_MENU_FOLDER = String.Empty;
    private readonly string MEDIAS_DRIVE;

    public MediaServices(WebFamilyDbContext context, IOptions<ApplicationSettings> appSettings,
        IHostEnvironment env)
    {
        _context = context;
        _appSettings = appSettings;
        MEDIAS_DRIVE = appSettings.Value.MediaDrive + @"\";
        //_mapper = mapper;
        if (env.IsDevelopment())
        {
            var arr = Directory.GetCurrentDirectory().Split(@"\");
            var LastDirec = arr[arr.Length - 1];
            var newDirec = LastDirec.Split(".")[0] + ".client";
            arr[arr.Length - 1] = newDirec;
            JSON_MENU_FOLDER = Path.Combine(string.Join(@"\", arr), @"public\json\menus");
        }
        else
        {
            JSON_MENU_FOLDER = @"C:\inetpub\wwwroot\wwwroot\json\menus";
        }
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
            throw new ApplicationException(ex.Message);
        }
        return Record;
    }
    public async Task<IEnumerable<MediaMenu>> GetMenuList()
    {
        return await _context.MediaMenus.ToListAsync();
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

    // json file
    public JsonResult RemoveMediaDirectory(Guid id)
    {
        MediaDirectory record = new();
        MediaMenu menuRecord = new();
        if (_context.MediaDirectories.Any(i => i.RecordId == id))
        {
            record = _context.MediaDirectories.Single(i => i.RecordId == id);
            _context.MediaDirectories.Remove(record);
            _context.SaveChanges();

            menuRecord = _context.MediaMenus.Single(i => i.RecordId == record.MenuId);
            var folderPath = Path.Combine(JSON_MENU_FOLDER, menuRecord.Menu);
            folderPath = Path.Combine(folderPath, "menu.json");
            UpdateJson updateMenu = new();
            updateMenu.DeleteJsonData(folderPath, record.Directory);
        }
        return new JsonResult(record.Directory + " has been deleted from Database.");
    }
    public JsonResult AddMediaDirectory(JsonMenu folder)
    {
        MediaMenu menuRecord = new();
        MediaDirectory record = new()
        {
            RecordId = Guid.NewGuid(),
            Directory = folder.Param,
            MenuId = folder.RecordId,
            Datetime = new DateTime()
        };
        // check if it is existed...
        if (!_context.MediaDirectories.Any(e => (e.MenuId == record.MenuId && e.Directory == record.Directory))) 
        {
            //  add to directory
            _context.MediaDirectories.Add(record);
            _context.SaveChanges();
        } else
        {
            return new JsonResult(folder.Param + " is existed in Directory Database.");
        }
        if (_context.MediaMenus.Any(i => i.RecordId == folder.RecordId))
        {
            UpdateJson updateMenu = new();
            menuRecord = _context.MediaMenus.Single(i => i.RecordId == folder.RecordId);
            updateMenu.Update(menuRecord.Menu, folder.Param, folder.Title, JSON_MENU_FOLDER);
        }
        return new JsonResult(folder.Param + "has been added into Database.");
    }
    public JsonResult RemoveLink(string urllnk)
    {
        var folderPath = Path.Combine(JSON_MENU_FOLDER, "links", "menu.json");
        UpdateJson updateMenu = new();
        updateMenu.DeleteJsonData(folderPath, urllnk);
        return new JsonResult("has been removed from Link.");
    }
    public JsonResult AddLink(MenuRecord folder)
    {
        UpdateJson updateMenu = new();
        updateMenu.Update("links", folder.param, folder.title, JSON_MENU_FOLDER);
        return new JsonResult("has been added into Links.");
    }
    public JsonResult RenameMediafile(RenameFile record)
    {
        string OrigFile = string.Empty;
        MediaMetaDatum mediaRecord = new();
        try
        {
            mediaRecord = _context.MediaMetaData.Single(i => i.RecordId == record.recordId);
        }
        catch (Exception ex)
        {
            throw new ApplicationException(ex.Message);
        }
        //int idx = mediaRecord.fromFile.LastIndexOf(@"\");
        //var fromOrigFile = record.fromFile[(idx + 1)..];
        // extension
        int idx = mediaRecord.Title.LastIndexOf(@".");
        var toNewFile = record.toFile + @"." + mediaRecord.Title[(idx + 1)..];
        var folder = Path.Combine(MEDIAS_DRIVE, record.fromFolder);
        OrigFile = Path.Combine(folder, mediaRecord.Title);
        toNewFile = Path.Combine(folder, toNewFile);
        try
        {
            System.IO.File.Move(OrigFile, toNewFile);
        }
        catch (Exception ex)
        {
            throw new ApplicationException(ex.Message);
        }
        mediaRecord.Title = record.toFile + @"." + mediaRecord.Title[(idx + 1)..];
        _context.MediaMetaData.Update(mediaRecord);
        _context.SaveChanges();
        return new JsonResult("File has been renamed.");
    }
    public MediaMetaDatum GetById(Guid Id)
    {

        var record = _context.MediaMetaData.Find(Id);
        if (record is null)
        {
            throw new KeyNotFoundException("Todo not found");
        }
        return record;
    }
    public JsonResult DeleteById(Guid id)
    {
        MediaMetaDatum mediaRecord = new();
        try
        {
            mediaRecord = _context.MediaMetaData.Single(i => i.RecordId == id);
        }
        catch (Exception ex)
        {
            throw new ApplicationException(ex.Message);
        }

        _context.MediaMetaData.Remove(mediaRecord);
        _context.SaveChanges();
        return new JsonResult("Media File has been deleted successfully");
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
            throw new ApplicationException(ex.Message);
        }
        return Record;
    }
    public async Task<IEnumerable<VideosView>> GetVideosView()
    {
        return await _context.VideosViews
            .Where(x => (x.Duration == "00:00:00" || x.Duration == ""))
            .ToListAsync();
    }
    public async Task<IEnumerable<MoviesView>> GetMoviesView()
    {
        return await _context.MoviesViews
             .Where(x => (x.Duration == "00:00:00" || x.Duration == ""))
            .ToListAsync();

    }
    public async Task<IEnumerable<MusicsView>> GetMusicsView()
    {
        return await _context.MusicsViews
             .Where(x => (x.Duration == "00:00:00" || x.Duration == ""))
            .ToListAsync();

    }
    public async Task<MediaView> UpdateMediasDuration(Guid RecordId, string Duration)
    {
        MediaMetaDatum Record = new();
        Record = _context.MediaMetaData
            .Single(i => i.RecordId == RecordId);
        Record.Duration = Duration;
        _context.MediaMetaData.Update(Record);
        _context.SaveChanges();
        return await _context.MediaViews
            .SingleAsync(i => i.RecordId == RecordId);

    }
   
}
