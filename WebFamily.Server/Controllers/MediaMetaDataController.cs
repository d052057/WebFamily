using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class MediaMetaDataController : ControllerBase
    {
        private readonly IMediaServices _mediaServices;
        public MediaMetaDataController(IMediaServices mediaServices)
        {
            _mediaServices = mediaServices;
        }

        [HttpGet("GetFilesByFolder")]
        public async Task<ActionResult> GetFilesByFolder(string folder, string menu)
        {
            var record = await _mediaServices.GetFilesByFolder(folder, menu);
            return Ok(record);
        }
        [HttpGet("GetDirectoryList/{id}")]
        public async Task<IEnumerable<MediaDirectory>> GetDirectoryList(Guid id)
        {
            return await _mediaServices.GetDirectoryList(id);
        }      
        [HttpGet("DirectoryIndex")]
        public async Task<IEnumerable<MediaDirectory>> DirectoryIndex()
        {
            return await _mediaServices.DirectoryIndex();
        }
        [HttpGet("Index")]
        public IEnumerable<MediaMetaDatum> Index()
        {
            return _mediaServices.Index();
        }
        [HttpGet("GetMediaDirectory/{id}")]
        public async Task<ActionResult<MediaDirectory>> GetMediaDirectory(Guid id)
        {
            var files = await _mediaServices.GetMediaDirectory(id);
            return Ok(files);
        }

        [HttpGet("GetRockDirectory")]
        public async Task<IEnumerable<AmericanMusicsDirectoryView>> GetRockDirectory()
        {
            return await _mediaServices.GetRockDirectory();
        }
        [HttpGet("GetRockSong/{Folder}")]
        public async Task<IEnumerable<AmericanMusicsView>> GetRockSong(string Folder)
        {
            return await _mediaServices.GetRockSong(Folder);
        }       
    }
}