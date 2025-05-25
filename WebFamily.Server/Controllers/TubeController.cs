using Microsoft.AspNetCore.Mvc;
//using System;
//using System.Collections.Generic;
//using System.ComponentModel;
//using System.Diagnostics;
//using System.Management;
//using System.Net.Http;
//using System.Runtime.CompilerServices;
//using System.Threading.Tasks;
using WebFamily.Models;
using WebFamily.Services;

namespace WebFamily.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class TubeController : ControllerBase
    {
        private readonly ITubeServices _tubeServices;
        public TubeController(ITubeServices linkTubeServices)
        {
            _tubeServices = linkTubeServices;
        }
        [HttpGet("Gettubes")]
        public async Task<IEnumerable<WebTube>> Gettubes()
        {
            return await _tubeServices.Gettubes();

        }
        [HttpGet("{Id}")]
        public async Task<ActionResult<WebTube>> GetTubeById(Guid Id)
        {
            return await _tubeServices.GetTubeById(Id);
        }
        [HttpPut("Update")]
        public async Task<ActionResult<WebTube>> Update([FromBody] WebTube WebtubeRecord)
        {
            WebTube Record = await _tubeServices.UpdateWebTube(WebtubeRecord);
            return Ok(Record);
        }
        [HttpPost("Add")]
        public async Task<ActionResult<WebTube>> Add([FromBody] WebTube WebtubeRecord)
        {
            return await _tubeServices.AddWebTube(WebtubeRecord);
        }
        [HttpPost("DownloadYoutube")]
        public async Task<ActionResult> DownloadYoutube([FromBody] YTDownload Data)
        {
            bool downloaded = await _tubeServices.DownloadYoutube(Data);
            if (downloaded)
            {
                return Ok(new { message = "download" });
            }
            else
            {
                return BadRequest();
            }
        }
        // DELETE: Webtube Series and Webtube
        [HttpDelete]
        [Route("Delete/{id}")]
        public async Task<ActionResult> Delete([FromRoute] Guid id)
        {
            bool deleted = await _tubeServices.DelWebTube(id);
            if (deleted)
            {
                return Ok(new { message = "WebTube record deleted successfully" });
            }
            else
            {
                return BadRequest();
            }
        }
    }
}