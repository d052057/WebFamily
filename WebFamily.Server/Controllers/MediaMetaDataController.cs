//using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
//using Microsoft.Identity.Client.Extensions.Msal;
using WebFamily.Models;
using WebFamily.Services;
//using WebFamily.Helpers;
using System.Web;
//using System.Threading.Tasks;
//using System.Collections.Generic;
//using System;
//using Newtonsoft.Json;
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.EntityFrameworkCore.Internal;
//using Microsoft.AspNetCore.Hosting.StaticWebAssets;
//using Google.Apis.Auth.OAuth2;
namespace WebFamily.Controllers
{

    [Route("[controller]")]
    [ApiController]
    public class MediaMetaDataController : ControllerBase
    {
        private readonly IMediaServices _mediaServices;
        public MediaMetaDataController(IMediaServices mediaservices)
        {
            _mediaServices = mediaservices;
        }
      
        [HttpGet("GetFilesByFolder")]
        public async Task<ActionResult> GetFilesByFolder(string folder, string menu)
        {
            var xfiles = await _mediaServices.GetFilesByFolder(folder, menu);
            return Ok(xfiles);
        }
        [HttpGet("GetMenuList")]
        public async Task<ActionResult> GetMenuList()
        {
            return Ok(await _mediaServices.GetMenuList());
        }
        [HttpGet("GetDirectoryList/{id}")]
        public async Task<IEnumerable<MediaDirectory>> GetDirectoryList(Guid id)
        {
            return await _mediaServices.GetDirectoryList(id);

        }
        [HttpDelete]
        [Route("RemoveMediaDirectory/{id}")]
        public JsonResult RemoveMediaDirectory(Guid id)
        {
            return _mediaServices.RemoveMediaDirectory(id);
        }
        [HttpPost("AddMediaDirectory")]
        public JsonResult AddMediaDirectory(JsonMenu folder)
        {
            return _mediaServices.AddMediaDirectory(folder);
        }
        [HttpPost("AddLink")]
        public JsonResult AddLink(MenuRecord rec)
        {
            return _mediaServices.AddLink(rec);
        }

        [HttpPost("RenameMediafile")]
        public JsonResult RenameMediafile(RenameFile rec)
        {

            return _mediaServices.RenameMediafile(rec);
        }

        [HttpPost("updateMediasDuration")]
        public async Task<MusicsView> UpdateMediasDuration(MusicsView data)
        {
            MusicsView view = data;
            var rec = await _mediaServices.UpdateMediasDuration(data.RecordId, data.Duration);
            view.Duration = rec.Duration;
            return view;
        }

        [HttpDelete]
        [Route("RemoveLink/{id}")]
        public JsonResult RemoveLink(string id)
        {
            string urllink = HttpUtility.UrlDecode(id);
            return _mediaServices.RemoveLink(urllink);
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
        [HttpDelete("DeleteById/{id}")]
        public JsonResult DeleteById(Guid id)
        {
            return _mediaServices.DeleteById(id);

        }
        //[HttpGet("Yitong")]
        //public string Yitong()
        //{
        //    DynatreeItem di = new DynatreeItem(new DirectoryInfo(@"c:\medias\musics"));
        //    return di.DynatreeToJson();

        //}
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
        [HttpGet("videosView")]
        public async Task<IEnumerable<VideosView>> GetVideosView()
        {
            return await _mediaServices.GetVideosView();

        }
        [HttpGet("musicsView")]
        public async Task<IEnumerable<MusicsView>> GetMusicsView()
        {
            return await _mediaServices.GetMusicsView();

        }
        [HttpGet("MoviesView")]
        public async Task<IEnumerable<MoviesView>> GetMoviesView()
        {
            return await _mediaServices.GetMoviesView();

        }
    }
}