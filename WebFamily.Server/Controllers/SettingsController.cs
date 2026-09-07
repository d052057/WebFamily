using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebFamily.Server.DTOs;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ApplicationSettings _appSettings;

        public SettingsController(IConfiguration config, IOptions<ApplicationSettings> appSettings)
        {
            _config = config;
            _appSettings = appSettings.Value;
        }

        // Anonymous on purpose: the login and register pages need this
        // before a user is authenticated, and the value itself (a Google
        // OAuth Client ID) is not a secret - it was already shipped inside
        // the public JS bundle before this endpoint existed.
        [AllowAnonymous]
        [HttpGet("public")]
        public ActionResult<PublicClientSettingsDto> GetPublicSettings()
        {
            // Only the URL-facing folder segments go to the client - never
            // ApplicationSettings.MediaDrive (the physical drive letter/path),
            // which stays server-side only. Each value is normalized via
            // ToWebPath() here, once, so the client never has to deal with
            // Windows-style backslashes from config or the database.
            return Ok(new PublicClientSettingsDto
            {
                GoogleClientId = _config["Google:ClientId"] ?? string.Empty,
                GoogleMapsApiKey = _config["GoogleMaps:ApiKey"] ?? string.Empty,
                YoutubeApiKey = _config["YouTube:ApiKey"] ?? string.Empty,
                FacebookAppId = _config["Facebook:AppId"] ?? string.Empty,
                MediaBasePath = ApplicationSettings.MediaRequestPath,
                PhotoFolder = $"{ApplicationSettings.MediaRequestPath}/{_appSettings.AssetPhotoFolder.ToWebPath()}",
                RpmFolder = $"{ApplicationSettings.MediaRequestPath}/{_appSettings.AssetRpmFolder.ToWebPath()}",
                RpmCoverFolder = $"{ApplicationSettings.MediaRequestPath}/{_appSettings.AssetRpmCoverFolder.ToWebPath()}"
            });
        }
    }
}
