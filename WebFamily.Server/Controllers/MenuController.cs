using Microsoft.AspNetCore.Authorization;
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
    [Authorize(Policy = "AdminPolicy")]
    public class MenuController : ControllerBase
    {
        private readonly ILogger<MenuController> _logger;
        private readonly WebFamilyDbContext _context;
        private readonly ApplicationSettings _appSettings;
        private readonly string _mediasDrive;
       public MenuController(ILogger<MenuController> logger,
            WebFamilyDbContext context,
            IOptions<ApplicationSettings> appSettings
            )
        {
            _logger = logger;
            _context = context;
            _appSettings = appSettings?.Value ?? throw new ArgumentNullException(nameof(appSettings));
            _mediasDrive = Path.Combine(_appSettings.MediaDrive, "");
        }

        [AllowAnonymous]
        [HttpGet]
        public IActionResult GetAllMenus()
        {
            var menus = MenuMemoryStore.GetAllMenus();
            return Ok(menus);
        }

        [AllowAnonymous]
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

        [AllowAnonymous]
        [HttpGet("{menuId}/items")]
        public IActionResult GetMenuItems(string menuId)
        {
            var items = MenuMemoryStore.GetMenuItems(menuId);
            return Ok(items);
        }

        [AllowAnonymous]
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


        [HttpPost("refresh")]
        public IActionResult RefreshMenus()
        {
            // Force reload from disk (useful for debugging)
            var menus = MenuMemoryStore.GetAllMenus();
            return Ok($"Refreshed {menus.Count} menus from memory");
        }

 
        /// <summary>
        /// Best-effort rollback: moves already-renamed subtitle files back to
        /// their original names if a later step in the rename fails partway
        /// through, so a failed rename doesn't leave subtitles mismatched
        /// with the (unchanged) video file.
        /// </summary>
        private static void RollbackSubtitleRenames(List<(string From, string To)> renamed)
        {
            foreach (var (from, to) in renamed)
            {
                try
                {
                    if (System.IO.File.Exists(to) && !System.IO.File.Exists(from))
                    {
                        System.IO.File.Move(to, from);
                    }
                }
                catch
                {
                    // best-effort cleanup only
                }
            }
        }
    }
}