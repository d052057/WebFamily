using Microsoft.AspNetCore.Mvc;
//using Microsoft.AspNetCore.Cors;
using WebFamily.Models;
using WebFamily.Services;
using Microsoft.Extensions.Options;
using WebFamily.Helpers;
//using System.Threading.Tasks;
//using System.Collections.Generic;

namespace WebFamily.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class RpmController : ControllerBase
    {
        private readonly IOptions<ApplicationSettings> _appSettings;
        private readonly IRpmServices _rpmservices;
        private readonly string _mediaDrive;
        private readonly string _pdfFolder;
        public RpmController(
            IRpmServices rpmservices,
            IOptions<ApplicationSettings> appSettings
            )
        {
            _rpmservices = rpmservices;
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
    }
}
