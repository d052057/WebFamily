//#nullable disable

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
            // Only a menu that exists in the MediaMenu table can be scanned. The menu name also becomes
            // a folder name below, so this check is what keeps a crafted value (e.g. "..\\x") out of the path.
            var canonical = (await _treeService.GetMenus())
                .FirstOrDefault(m => string.Equals(m, menu, StringComparison.OrdinalIgnoreCase));
            if (canonical is null)
            {
                return BadRequest($"'{menu}' is not a menu in the MediaMenu table.");
            }

            var roots = ResolveScanRoots(canonical);
            if (roots.Count == 0)
            {
                return BadRequest($"No usable scan folder for menu '{canonical}'.");
            }

            // The scan clears the menu's rows first, so refuse to start if the folder isn't there
            // (a missing folder or an offline drive would otherwise wipe the menu for nothing).
            if (!Directory.Exists(roots[0].PhysicalPath))
            {
                return BadRequest($"Scan folder not found: {roots[0].PhysicalPath}");
            }

            var results = await _scanService.ScanAsync(canonical, roots);
            return Ok(results);
        }

        // Every menu name in the MediaMenu table, e.g. ["musics","movies","videos","books","photos"].
        // GET /MediaFolder/Menus
        [HttpGet("Menus")]
        public async Task<ActionResult<List<string>>> Menus()
        {
            return Ok(await _treeService.GetMenus());
        }

        // Returns the full folder tree (artists -> albums -> ... -> songs) for one menu.
        // e.g. GET /MediaFolder/Tree/musics
        [HttpGet("Tree/{menu}")]
        public async Task<ActionResult> Tree(string menu)
        {
            var tree = await _treeService.GetFolderTree(menu);
            return Ok(tree);
        }

        // A menu's scan folder is its own name under MediaDrive, unless
        // ApplicationSettings:MediaMenus overrides it (see ApplicationSettings.GetMenuFolder). Nothing
        // here names a menu, so a new MediaMenu row works without a code change.
        private List<ScanRoot> ResolveScanRoots(string menu)
        {
            var relativePath = _appSettings.GetMenuFolder(menu);
            if (string.IsNullOrEmpty(relativePath))
            {
                return new List<ScanRoot>();
            }

            var mediaRoot = Path.TrimEndingDirectorySeparator(Path.GetFullPath(_appSettings.MediaDrive));
            var physicalPath = Path.GetFullPath(Path.Combine(mediaRoot, relativePath));

            // The folder must sit inside MediaDrive, whatever the setting or menu name says.
            if (!physicalPath.StartsWith(mediaRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            {
                return new List<ScanRoot>();
            }

            return new List<ScanRoot>
            {
                new(
                    PhysicalPath: physicalPath,
                    UrlPrefix: relativePath.Replace('\\', '/'))
            };
        }
    }
}
