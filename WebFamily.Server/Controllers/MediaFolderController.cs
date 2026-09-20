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
            var roots = ResolveScanRoots(menu);
            if (roots.Count == 0)
            {
                return BadRequest($"No configured root folder for menu '{menu}'.");
            }

            var results = await _scanService.ScanAsync(menu, roots);
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

        // Every menu -> physical root mapping lives here, once. "musics" is a
        // single root now (the whole musics folder) - the scan service's
        // shape-based detection finds every real end-item (artist) underneath
        // on its own, no matter how many pass-through/category folders
        // (AmericanMusics, a "Songs" wrapper, etc.) sit above them. No
        // per-name exclusion list needed here anymore.
        private static readonly Dictionary<string, Func<ApplicationSettings, string?>> MenuRootMap =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["musics"] = s => s.AssetAlbumFolder
            };

        private List<ScanRoot> ResolveScanRoots(string menu)
        {
            if (!MenuRootMap.TryGetValue(menu, out var selector))
            {
                return new List<ScanRoot>();
            }

            var relativePath = selector(_appSettings);
            if (string.IsNullOrEmpty(relativePath))
            {
                return new List<ScanRoot>();
            }

            var mediasDrive = Path.Combine(_appSettings.MediaDrive, "");

            return new List<ScanRoot>
            {
                new(
                    PhysicalPath: Path.Combine(mediasDrive, relativePath),
                    UrlPrefix: relativePath.Replace('\\', '/'))
            };
        }
    }
}
