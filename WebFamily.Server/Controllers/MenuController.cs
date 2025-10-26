// Controllers/MenuController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MenuController : ControllerBase
    {
        private readonly ILogger<MenuController> _logger;
        private readonly WebFamilyDbContext _context;
        private readonly ApplicationSettings _appSettings;
        private readonly string _mediasDrive;
        private readonly IUpdateDataBaseServices _updateDataBaseServices;
       public MenuController(ILogger<MenuController> logger,
            WebFamilyDbContext context,
            IOptions<ApplicationSettings> appSettings,
            IUpdateDataBaseServices updateDataBaseServices)
        {
            _logger = logger;
            _context = context;
            _appSettings = appSettings?.Value ?? throw new ArgumentNullException(nameof(appSettings));
            _mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
            _updateDataBaseServices = updateDataBaseServices ?? throw new ArgumentNullException(nameof(updateDataBaseServices));
        }

        [HttpGet]
        public IActionResult GetAllMenus()
        {
            var menus = MenuMemoryStore.GetAllMenus();
            return Ok(menus);
        }

        [HttpGet("{menuId}")]
        public IActionResult GetMenu(string menuId)
        {
            var menu = MenuMemoryStore.GetMenu(menuId);
            if (menu == null)
            {
                return NotFound($"Menu '{menuId}' not found");
            }

            return Ok(menu);
        }

        [HttpGet("{menuId}/items")]
        public IActionResult GetMenuItems(string menuId)
        {
            var items = MenuMemoryStore.GetMenuItems(menuId);
            return Ok(items);
        }

        [HttpGet("{menuId}/version")]
        public IActionResult GetMenuVersion(string menuId)
        {
            var version = MenuMemoryStore.GetVersion(menuId);
            if (version == null)
            {
                return NotFound($"Menu '{menuId}' not found");
            }

            return Ok(new { version });
        }

        [HttpPost("addMenuItem/{menuId}/items")]
        public IActionResult AddMenuItem(string menuId, [FromBody] MenuItem newItem)
        {
            if (string.IsNullOrEmpty(newItem.Title) || string.IsNullOrEmpty(newItem.Param))
            {
                return BadRequest("Title and Param are required");
            }

            var success = MenuMemoryStore.AddMenuItem(menuId, newItem);
            if (!success)
            {
                return NotFound($"Menu '{menuId}' not found");
            }
            else
            {
                if (!(menuId == "links"))
                {
                    if (_context.MediaMenus.Any(m => m.Menu == menuId))
                    {
                        MediaMenu menuRecord = _context.MediaMenus.Single(m => m.Menu == menuId);
                        if (!_context.MediaDirectories.Any(i => i.Directory == newItem.Param && i.MenuId == menuRecord.RecordId))
                        {
                            MediaDirectory record = new()
                            {
                                RecordId = Guid.NewGuid(),
                                Directory = newItem.Param,
                                MenuId = menuRecord.RecordId,
                                Datetime = new DateTime()
                            };
                            _context.MediaDirectories.Add(record);
                            _context.SaveChanges();
                        }
                    }
                    string path = Path.Combine(_mediasDrive, menuId, newItem.Param);
                    if (!Directory.Exists(path))
                    {
                        Directory.CreateDirectory(path);
                        Console.WriteLine("Directory was created.");
                    }
                    else
                    {
                        Console.WriteLine("Directory already exists.");
                    }
                }
            }

            _logger.LogInformation($"Added item '{newItem.Title}' to menu '{menuId}'");
            return Ok(MenuMemoryStore.GetMenu(menuId));
        }

        [HttpDelete("removeMenuItem/{menuId}/items/{itemId}")]
        public IActionResult RemoveMenuItem(string menuId, string itemId)
        {
            // Replace the problematic line with the following code:
            var decodedItemId = Uri.UnescapeDataString(itemId); // Decodes a URI-encoded string
            var success = MenuMemoryStore.RemoveMenuItem(menuId, decodedItemId);
            if (!success)
            {
                return NotFound($"Menu '{menuId}' or item with MenuItem {decodedItemId} not found");
            }
            else
            {
                if (!(menuId == "links"))
                {
                    if (_context.MediaMenus.Any(m => m.Menu == menuId))
                    {
                        MediaMenu menuRecord = _context.MediaMenus.Single(m => m.Menu == menuId);
                        if (_context.MediaDirectories.Any(i => i.Directory == decodedItemId && i.MenuId == menuRecord.RecordId))
                        {
                            MediaDirectory record = _context.MediaDirectories.Single(i => i.Directory == decodedItemId && i.MenuId == menuRecord.RecordId);
                            _context.MediaDirectories.Remove(record);
                            _context.SaveChanges();
                        }
                    }
                }
            }

            _logger.LogInformation($"Removed item with ID {decodedItemId} from menu '{menuId}'");
            return Ok(MenuMemoryStore.GetMenu(menuId));
        }

        [HttpPut("{menuId}")]
        public IActionResult UpdateMenu(string menuId, [FromBody] MenuData updatedMenu)
        {
            MenuMemoryStore.UpdateMenu(menuId, updatedMenu);
            _logger.LogInformation($"Updated menu '{menuId}'");
            return Ok(updatedMenu);
        }

        [HttpPost("refresh")]
        public IActionResult RefreshMenus()
        {
            // Force reload from disk (useful for debugging)
            var menus = MenuMemoryStore.GetAllMenus();
            return Ok($"Refreshed {menus.Count} menus from memory");
        }

        [HttpPost("RenameFile")]
        public IActionResult RenameFile([FromBody] RenameFile record)
        {
            if (_context.MediaMetaData.Any(i => i.RecordId == record.recordId))
            {
                MediaMetaDatum mediaRecord = _context.MediaMetaData.Single(i => i.RecordId == record.recordId);
                var fileExtension = Path.GetExtension(mediaRecord.Title);
                if (string.IsNullOrEmpty(fileExtension))
                {
                    return BadRequest("File has no extension");
                }
                var newFileName = $"{record.toFile}{fileExtension}";

                var folder = Path.Combine(_mediasDrive, record.fromFolder);
                string fromFile = Path.Combine(folder, mediaRecord.Title);

                mediaRecord.Title = newFileName; // Update the title with the new file name 

                newFileName = Path.Combine(folder, newFileName);
                try
                {
                    System.IO.File.Move(fromFile, newFileName);
                }
                catch (UnauthorizedAccessException)
                {
                    return StatusCode(403, "Access denied. Check file permissions.");
                }
                catch (DirectoryNotFoundException)
                {
                    return NotFound("Directory not found");
                }
                catch (IOException ex)
                {
                    return Conflict($"File operation failed: {ex.Message}");
                }
                catch (Exception ex)
                {
                    // Log the exception here if you have logging
                    return StatusCode(500, $"An unexpected error occurred during file rename: {ex.Message}");
                }
                _context.MediaMetaData.Update(mediaRecord);
                _context.SaveChanges();
            }
            else
            {
                return BadRequest($"Invalid mediaRecordId: {record.recordId}");
            }
            return Ok(new { message = "File name has been renamed." });
        }

        [HttpDelete("DeleteFile/recordId/{recordId}")]
        public IActionResult DeleteFile(Guid recordId)
        {
            string title;
            if (_context.MediaMetaData.Any(i => i.RecordId == recordId))
            {
                MediaMetaDatum mediaRecord = _context.MediaMetaData.Single(i => i.RecordId == recordId);
                title = mediaRecord.Title;
                _context.MediaMetaData.Remove(mediaRecord);
                _context.SaveChanges();
            }
            else
            {
                return BadRequest($"Invalid mediaRecordId: {recordId}");
            }

            return Ok(new { message = $"File name (title:{title}) has been deleted." });
        }

        [HttpGet("videosView")]
        public async Task<IEnumerable<VideosView>> GetVideosView()
        {
            return await _context.VideosViews
                .Where(x => x.Duration == "00:00:00" || x.Duration == "")
                .ToListAsync();
        }

        [HttpGet("musicsView")]
        public async Task<IEnumerable<MusicsView>> GetMusicsView()
        {
            return await _context.MusicsViews
                 .Where(x => x.Duration == "00:00:00" || x.Duration == "")
                .ToListAsync();

        }

        [HttpGet("MoviesView")]
        public async Task<IEnumerable<MoviesView>> GetMoviesView()
        {
            return await _context.MoviesViews
                .Where(x => x.Duration == "00:00:00" || x.Duration == "")
               .ToListAsync();

        }
        [HttpPost("UpdateMediasDuration")]
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
        //[HttpPost("initMediaDatabaseAsync")]
        //public async Task<IActionResult> InitMediaDatabaseAsync()
        //{
        //    string[] menus = ["videos", "musics", "photos", "books", "movies"];
        //    var allMenus = await _context.MediaMenus.ToListAsync(); // Actually fetch the data
        //    _context.MediaMenus.RemoveRange(allMenus);              // Now EF tracks each entity for deletion
        //    await _context.SaveChangesAsync();
        //    foreach (string menu in menus)
        //    {
        //        ClearAllMenuItems(menu);
        //        var menuRecord = new MediaMenu
        //        {
        //            RecordId = Guid.NewGuid(),
        //            Menu = menu,
        //            Datetime = DateTime.UtcNow
        //        };
        //        _context.MediaMenus.Add(menuRecord);
        //        await _context.SaveChangesAsync();
        //        var folderPath = Path.Combine(_mediasDrive, menuRecord.Menu);

        //        // Get only top-level subdirectories (no recursion)
        //        string[] subfolders = Directory.GetDirectories(folderPath, "*", SearchOption.TopDirectoryOnly);

        //        foreach (string subfolder in subfolders)
        //        {
        //            var fileName = Path.GetFileName(subfolder);
        //            if (fileName != "rpm")
        //            {
        //                // Add each subfolder as a MediaDirectory
        //                var mediaDirectory = new MediaDirectory
        //                {
        //                    RecordId = Guid.NewGuid(),
        //                    MenuId = menuRecord.RecordId,
        //                    Directory = fileName,
        //                    Datetime = DateTime.UtcNow
        //                };
        //                _context.MediaDirectories.Add(mediaDirectory);
        //                await _context.SaveChangesAsync();
        //                if (fileName != "AmericanMusics")
        //                {
        //                    var menuItem = new MenuItem
        //                    {
        //                        Title = mediaDirectory.Directory,
        //                        Param = mediaDirectory.Directory,
        //                    };
        //                    MenuMemoryStore.AddMenuItem(menu, menuItem);
        //                }
        //            }
        //        }
        //        _ = await _updateDataBaseServices.UpdateMetaData(menu);
        //    }
        //    _ = await _updateDataBaseServices.UpdateMetaData(@"americansongs");
        //    _ = await _updateDataBaseServices.UpdateMetaData(@"text");
        //    return Ok(new { message = $"MediaDatabase initialization is Completed." });
        //}
        //private static bool ClearAllMenuItems(string menuId)
        //{
        //    var menu = MenuMemoryStore.GetMenu(menuId);
        //    if (menu == null)
        //        return false;

        //    menu.Items.Clear(); // Remove all items
        //    MenuMemoryStore.UpdateMenu(menuId, menu);
        //    return true;
        //}
        [HttpPost("initMediaDatabaseAsync")]
        public async Task<IActionResult> InitMediaDatabaseAsync()
        {
            string[] menus = ["videos", "musics", "photos", "books", "movies"];

            // Clear existing menu entries
            _context.MediaMenus.RemoveRange(await _context.MediaMenus.ToListAsync());
            await _context.SaveChangesAsync();

            foreach (string menu in menus)
            {
                ClearAllMenuItems(menu);

                var menuRecord = new MediaMenu
                {
                    RecordId = Guid.NewGuid(),
                    Menu = menu,
                    Datetime = DateTime.UtcNow
                };

                _context.MediaMenus.Add(menuRecord);
                await _context.SaveChangesAsync(); // Save here to persist menuRecord for FK

                string folderPath = Path.Combine(_mediasDrive, menu);
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                    Console.WriteLine("Directory was created.");
                }
                var subfolders = Directory.GetDirectories(folderPath, "*", SearchOption.TopDirectoryOnly)
                          .Where(dir => Directory.EnumerateFileSystemEntries(dir).Any())
                          .ToList();
                var directoriesToAdd = new List<MediaDirectory>();
                var menuItemsToAdd = new List<MenuItem>();

                foreach (var subfolder in subfolders)
                {
                    var folderName = Path.GetFileName(subfolder);
                    if (folderName != "rpm")
                    {

                        var directory = new MediaDirectory
                        {
                            RecordId = Guid.NewGuid(),
                            MenuId = menuRecord.RecordId,
                            Directory = folderName,
                            Datetime = DateTime.UtcNow
                        };
                        directoriesToAdd.Add(directory);

                        if (folderName != "AmericanMusics")
                        {
                            menuItemsToAdd.Add(new MenuItem
                            {
                                Title = folderName,
                                Param = folderName
                            });
                        }
                    }
                }

                if (directoriesToAdd.Count > 0)
                {
                    _context.MediaDirectories.AddRange(directoriesToAdd);
                    await _context.SaveChangesAsync();
                }

                foreach (var item in menuItemsToAdd)
                {
                    MenuMemoryStore.AddMenuItem(menu, item);
                }

                _ = await _updateDataBaseServices.UpdateMetaData(menu);
            }

            // Additional metadata updates
            await _updateDataBaseServices.UpdateMetaData("americansongs");
            //await _updateDataBaseServices.UpdateMetaData("text");

            return Ok(new { message = "MediaDatabase initialization is Completed." });
        }

        private static bool ClearAllMenuItems(string menuId)
        {
            var menu = MenuMemoryStore.GetMenu(menuId);
            if (menu == null) return false;

            menu.Items.Clear();
            MenuMemoryStore.UpdateMenu(menuId, menu);
            return true;
        }

    }
}