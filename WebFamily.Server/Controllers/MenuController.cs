using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    // Only wraps MenuMemoryStore (the JSON-backed "links" menu) now - the
    // MediaMetaData/MediaDirectory-based endpoints this used to also expose
    // (RenameFile, Deletefile, addMenuItem, removeMenuItem,
    // initMediaDatabaseAsync) were removed along with those tables. Rename/
    // delete for the media libraries now lives in MusicMaintenanceController,
    // working against MediaFolder/MediaTrack instead.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminPolicy")]
    public class MenuController : ControllerBase
    {
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
    }
}