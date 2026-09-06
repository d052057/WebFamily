using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.DTOs;

namespace WebFamily.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly IConfiguration _config;

        public SettingsController(IConfiguration config)
        {
            _config = config;
        }

        // Anonymous on purpose: the login and register pages need this
        // before a user is authenticated, and the value itself (a Google
        // OAuth Client ID) is not a secret - it was already shipped inside
        // the public JS bundle before this endpoint existed.
        [AllowAnonymous]
        [HttpGet("public")]
        public ActionResult<PublicClientSettingsDto> GetPublicSettings()
        {
            return Ok(new PublicClientSettingsDto
            {
                GoogleClientId = _config["Google:ClientId"] ?? string.Empty,
                GoogleMapsApiKey = _config["GoogleMaps:ApiKey"] ?? string.Empty,
                YoutubeApiKey = _config["YouTube:ApiKey"] ?? string.Empty
            });
        }
    }
}
