using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    /// <summary>
    /// Admin CRUD for the bookmarks in Data/links.json (the "Links" dropdown in
    /// the nav bar). Same shape as TodoController, but backed by
    /// MenuMemoryStore/links.json instead of a SQL table.
    ///
    /// Every mutation rewrites links.json, which means the identity the app
    /// pool runs under needs WRITE permission on the Data folder - if it
    /// doesn't, these endpoints return a 500 saying so rather than appearing
    /// to succeed and then losing the change on the next recycle.
    /// </summary>
    [Authorize(Policy = "AdminPolicy")]
    [Route("api/[controller]")]
    [ApiController]
    public class LinksController : ControllerBase
    {
        private const string MenuId = "links";
        private const int MaxTitleLength = 200;
        private const int MaxUrlLength = 2000;

        private readonly ILogger<LinksController> _logger;

        public LinksController(ILogger<LinksController> logger)
        {
            _logger = logger;
        }

        // Anonymous like GetTodoList - it's the same data the public nav
        // bar's Links dropdown already shows to everyone.
        [AllowAnonymous]
        [HttpGet("GetLinks")]
        public ActionResult<IEnumerable<MenuItem>> GetLinks()
        {
            return Ok(MenuMemoryStore.GetMenuItems(MenuId));
        }

        [HttpPost("AddLink")]
        public ActionResult<IEnumerable<MenuItem>> AddLink([FromBody] MenuItem link)
        {
            var error = Validate(link, out var title, out var url);
            if (error != null) return BadRequest(error);

            if (TitleInUse(title, exceptId: null))
                return Conflict($"A link titled '{title}' already exists.");

            try
            {
                if (!MenuMemoryStore.AddMenuItem(MenuId, new MenuItem { Title = title, Param = url }))
                    return NotFound($"Menu '{MenuId}' not found.");
            }
            catch (Exception ex)
            {
                return SaveFailed(ex);
            }

            // Ids are renumbered on every save, so hand back the fresh list
            // rather than a single item whose id would already be stale.
            return Ok(MenuMemoryStore.GetMenuItems(MenuId));
        }

        [HttpPut("UpdateLink")]
        public ActionResult<IEnumerable<MenuItem>> UpdateLink([FromBody] MenuItem link)
        {
            var error = Validate(link, out var title, out var url);
            if (error != null) return BadRequest(error);

            if (TitleInUse(title, exceptId: link.Id))
                return Conflict($"A link titled '{title}' already exists.");

            try
            {
                if (!MenuMemoryStore.UpdateMenuItem(MenuId, link.Id, title, url))
                    return NotFound($"Link {link.Id} not found - the list may have changed, reload and try again.");
            }
            catch (Exception ex)
            {
                return SaveFailed(ex);
            }

            return Ok(MenuMemoryStore.GetMenuItems(MenuId));
        }

        [HttpDelete("DeleteLink/{id:int}")]
        public ActionResult<IEnumerable<MenuItem>> DeleteLink(int id)
        {
            try
            {
                if (!MenuMemoryStore.RemoveMenuItemById(MenuId, id))
                    return NotFound($"Link {id} not found - the list may have changed, reload and try again.");
            }
            catch (Exception ex)
            {
                return SaveFailed(ex);
            }

            return Ok(MenuMemoryStore.GetMenuItems(MenuId));
        }

        // Title required; URL must be an absolute http(s) URL. The scheme
        // check matters because the nav bar renders each URL as a clickable
        // href - this keeps things like javascript: URLs out of the file
        // entirely rather than relying only on the browser/framework to
        // neutralize them at render time.
        private static string? Validate(MenuItem? link, out string title, out string url)
        {
            title = string.Empty;
            url = string.Empty;

            if (link == null) return "Request body is required.";

            title = (link.Title ?? string.Empty).Trim();
            url = (link.Param ?? string.Empty).Trim();

            if (title.Length == 0) return "Title is required.";
            if (title.Length > MaxTitleLength) return $"Title must be {MaxTitleLength} characters or fewer.";
            if (url.Length == 0) return "URL is required.";
            if (url.Length > MaxUrlLength) return $"URL must be {MaxUrlLength} characters or fewer.";

            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return "URL must be a full web address starting with http:// or https://.";
            }

            return null;
        }

        private static bool TitleInUse(string title, int? exceptId) =>
            MenuMemoryStore.GetMenuItems(MenuId).Any(i =>
                (exceptId == null || i.Id != exceptId) &&
                string.Equals(i.Title, title, StringComparison.OrdinalIgnoreCase));

        private ObjectResult SaveFailed(Exception ex)
        {
            _logger.LogError(ex, "Failed to save {MenuId}.json", MenuId);
            return StatusCode(500,
                "The change could not be saved to Data/links.json. Check that the web app's " +
                "identity (the IIS app pool user) has write permission on the Data folder.");
        }
    }
}
