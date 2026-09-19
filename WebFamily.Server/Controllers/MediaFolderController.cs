using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class MediaFolderController : ControllerBase
    {
        private readonly IMediaFolderScanService _scanService;
        private readonly IMediaFolderTreeService _treeService;
        private readonly ApplicationSettings _appSettings;

        public MediaFolderController(
            IMediaFolderScanService scanService,
            IMediaFolderTreeService treeService,
            IOptions<ApplicationSettings> appSettings)
        {
            _scanService = scanService;
            _treeService = treeService;
            _appSettings = appSettings.Value;
        }

        // Rebuilds MediaFolder/MediaTrack for one menu from disk.
        // e.g. POST /MediaFolder/Scan?menu=musics
        [HttpPost("Scan")]
        public async Task<ActionResult<List<string>>> Scan(string menu)
        {
            var rootPath = ResolveRootPath(menu);
            if (rootPath is null)
            {
                return BadRequest($"No configured root folder for menu '{menu}'.");
            }

            var results = await _scanService.ScanAsync(menu, rootPath);
            return Ok(results);
        }

        // Returns the full folder tree (artists -> albums -> ... -> songs) for one menu.
        // e.g. GET /MediaFolder/Tree/musics
        [HttpGet("Tree/{menu}")]
        public async Task<ActionResult> Tree(string menu)
        {
            var tree = await _treeService.GetFolderTree(menu);
            return Ok(tree);
        }

        // Mirrors the menu -> folder mapping already used in UpdateDataBaseServices.
        // Extend this as more menus move to the folder-tree model.
        private string? ResolveRootPath(string menu)
        {
            var mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
            return menu.ToLowerInvariant() switch
            {
                "musics" => Path.Combine(mediasDrive, _appSettings.AssetSongFolder ?? ""),
                _ => null
            };
        }
    }
}

/*
============================================================================
Add to Program.cs, alongside the other AddScoped<> registrations:

    services.AddScoped<IMediaFolderScanService, MediaFolderScanService>();
    services.AddScoped<IMediaFolderTreeService, MediaFolderTreeService>();
============================================================================
*/
