using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;
using WebFamily.Server.Services;
namespace WebFamily.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RpmController : ControllerBase
    {
        private readonly IOptions<ApplicationSettings> _appSettings;
        private readonly IRpmServices _rpmservices;
        private readonly IRpmScanService _rpmScanService;
        private readonly string _mediaDrive;
        private readonly string _pdfFolder;
        public RpmController(
            IRpmServices rpmservices,
            IRpmScanService rpmScanService,
            IOptions<ApplicationSettings> appSettings
            )
        {
            _rpmservices = rpmservices;
            _rpmScanService = rpmScanService;
            _appSettings = appSettings;
            _mediaDrive = appSettings.Value.MediaDrive + @"\";
            _pdfFolder = appSettings.Value.AssetBookFolder!;
        }

        [HttpGet("GetRpms")]
        public async Task<IEnumerable<Rpm>> GetRpms()
        {
            return await _rpmservices.GetRpms();

        }
        [HttpGet("GetRpmMenu")]
        public async Task<IEnumerable<Rpm>> GetRpmMenu()
        {
            return await _rpmservices.GetRpmMenu();

        }
        [HttpGet("GetRpmTracks/{RecordId}")]
        public async Task<IEnumerable<RpmTrack>> GetRpmTracks(Guid RecordId)
        {
            return await _rpmservices.GetRpmTracks(RecordId);

        }

        // Wipes and rebuilds Rpm/RpmTrack from disk - native C# (TagLib +
        // TrackTitleParser + ArtistLookupService), no Python involved at
        // runtime. Admin-only since a full wipe+rebuild is exactly the kind
        // of mutating action the rest of the app already gates this way
        // (MusicMaintenanceController, etc.) - unlike the read-only GET
        // endpoints above, this one needed an explicit [Authorize] since the
        // controller itself has no class-level policy.
        [Authorize(Policy = "AdminPolicy")]
        [HttpPost("Regenerate")]
        public async Task<IActionResult> Regenerate()
        {
            var results = await _rpmScanService.ScanAsync();
            return Ok(results);
        }
    }
}
