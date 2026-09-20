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
            var urlRootPath = ResolveUrlRootPath(menu);
            if (urlRootPath is null)
            {
                return BadRequest($"No configured root folder for menu '{menu}'.");
            }

            var tree = await _treeService.GetFolderTree(menu, urlRootPath);
            return Ok(tree);
        }

        // menu (the MediaMenu row this data is filed under, e.g. "musics") is NOT
        // necessarily the same as the folder actually scanned (e.g. "musics"
        // reuses the existing menu but scans AssetSongFolder = "musics\AmericanMusics").
        // Every menu -> config-key mapping lives here, once, so Scan/Tree/URL
        // building can never drift apart from each other again.
        private static readonly Dictionary<string, Func<ApplicationSettings, string?>> MenuFolderMap =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["musics"] = s => s.AssetSongFolder
            };

        // Physical path on disk, for the scan job to walk.
        private string? ResolveRootPath(string menu)
        {
            var relative = ResolveConfiguredFolder(menu);
            if (relative is null) return null;

            var mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
            return Path.Combine(mediasDrive, relative);
        }

        // URL-facing prefix for the SAME folder, for building playable track/cover
        // URLs - forward slashes only, since this becomes part of an HTTP path,
        // not a filesystem path.
        private string? ResolveUrlRootPath(string menu)
        {
            var relative = ResolveConfiguredFolder(menu);
            return relative?.Replace('\\', '/');
        }

        private string? ResolveConfiguredFolder(string menu) =>
            MenuFolderMap.TryGetValue(menu, out var selector) ? selector(_appSettings) : null;
    }
}

