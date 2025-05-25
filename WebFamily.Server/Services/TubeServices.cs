using WebFamily.Helpers;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebFamily.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using WebFamily.Controllers;
using System.Net.Http;
using Google.Apis.Http;
using Microsoft.Extensions.Options;
using YoutubeExplode;
using YoutubeExplode.Videos.Streams;
using YoutubeExplode.Converter;
using YoutubeExplode.Common;
using System.IO;
using AngleSharp.Dom;
using static System.Net.WebRequestMethods;
using CliWrap.EventStream;
using YoutubeExplode.Videos.ClosedCaptions;
using System.Diagnostics.Eventing.Reader;
using System.Diagnostics;
using YoutubeExplode.Playlists;
using System.Runtime.Intrinsics.Arm;
using YoutubeExplode.Videos;
namespace WebFamily.Services
{
    public interface ITubeServices
    {
        Task<IEnumerable<WebTube>> Gettubes();
        Task<WebTube> GetTubeById(Guid Id);
        Task<WebTube> UpdateWebTube(WebTube WebtubeRecord);
        Task<WebTube> AddWebTube(WebTube WebtubeRecord);
        Task<Boolean> DelWebTube(Guid id);
        Task<Boolean> DownloadYoutube(YTDownload record);
    }
    public class TubeServices : ITubeServices
    {
        private readonly WebFamilyDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IOptions<ApplicationSettings> _appSettings;
        private readonly string _mediaDrive;
        private readonly string _mediaPosterDrive;
        private Uri _uri;
        private Uri _uriList;
        public TubeServices(WebFamilyDbContext context,
            System.Net.Http.IHttpClientFactory httpClientFactory,
            IOptions<ApplicationSettings> appSettings)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _appSettings = appSettings;
            _mediaPosterDrive = appSettings.Value.MediaDrive + @"\poster";
            _mediaDrive = appSettings.Value.MediaDrive;
        }
        public async Task<IEnumerable<WebTube>> Gettubes()
        {
            return await _context.WebTubes
                .Include(p => p.WebTubeSeries.OrderBy(s => s.SeqNumber))
                .OrderBy(s => s.Category)
                .ToListAsync();
        }

        public async Task<WebTube> GetTubeById(Guid id)
        {

            WebTube record = await _context.WebTubes
                                    .Where(i => i.RecordId == id)
                                    .Include(p => p.WebTubeSeries.OrderBy(s => s.SeqNumber))
                                    .FirstAsync();

            return record == null ? throw new Exception(string.Format("Can't find webtube {0}. {1}", id.ToString(), "Error")) : record;
        }
        public async Task<WebTube> UpdateWebTube(WebTube Record)
        {
            try
            {
                _context.Entry(Record).State = EntityState.Modified;
                _context.WebTubes.Update(Record);
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                throw new ApplicationException(ex.Message);
            }
            return await _context.WebTubes
                .Where(i => i.RecordId == Record.RecordId)
                .Include(p => p.WebTubeSeries)
                .SingleAsync();
        }
        public async Task<WebTube> AddWebTube(WebTube WebtubeRecord)
        {
            WebTube record = new()
            {
                RecordId = Guid.NewGuid(),
                Category = WebtubeRecord.Category,
                Note = WebtubeRecord.Note,
                WebTubeLink = WebtubeRecord.WebTubeLink,
                WebTubeTitle = WebtubeRecord.WebTubeTitle,
                VideoId = WebtubeRecord.VideoId,
                VideoListId = WebtubeRecord.VideoListId,
                ThumbnailDefaultUrl = WebtubeRecord.ThumbnailDefaultUrl,
                ThumbnailMediumUrl = WebtubeRecord.ThumbnailMediumUrl,
                ThumbnailHighUrl = WebtubeRecord.ThumbnailHighUrl,
                ThumbnailStandardUrl = WebtubeRecord.ThumbnailStandardUrl,
                ThumbnailMaxresUrl = WebtubeRecord.ThumbnailMaxresUrl,

                ThumbnailDefaultWidth = WebtubeRecord.ThumbnailDefaultWidth,
                ThumbnailMediumWidth = WebtubeRecord.ThumbnailMediumWidth,
                ThumbnailHighWidth = WebtubeRecord.ThumbnailHighWidth,
                ThumbnailStandardWidth = WebtubeRecord.ThumbnailStandardWidth,
                ThumbnailMaxresWidth = WebtubeRecord.ThumbnailMaxresWidth,

                ThumbnailDefaultHeight = WebtubeRecord.ThumbnailDefaultHeight,
                ThumbnailMediumHeight = WebtubeRecord.ThumbnailMediumHeight,
                ThumbnailHighHeight = WebtubeRecord.ThumbnailHighHeight,
                ThumbnailStandardHeight = WebtubeRecord.ThumbnailStandardHeight,
                ThumbnailMaxresHeight = WebtubeRecord.ThumbnailMaxresHeight
            };
            if (record.ThumbnailDefaultUrl.Length > 0)
            {
                this._uri = new(record.ThumbnailDefaultUrl);
            }
            if (record.ThumbnailStandardUrl.Length > 0)
            {
                this._uri = new(record.ThumbnailStandardUrl);
            }
            if (record.ThumbnailMediumUrl.Length > 0)
            {
                this._uri = new(record.ThumbnailMediumUrl);
            }
            if (record.ThumbnailHighUrl.Length > 0)
            {
                this._uri = new(record.ThumbnailHighUrl);
            }
            if (record.ThumbnailMaxresUrl.Length > 0)
            {
                this._uri = new(record.ThumbnailMaxresUrl);
            }
            await DownloadImageAsync(this._uri, record.VideoId);
            var Varray = WebtubeRecord.WebTubeSeries.ToArray();
            for (int i = 0; i < Varray.Length; i++) // for acts as a foreach  
            {
                Varray[i].RecordId = Guid.NewGuid();
                Varray[i].WebTubeId = record.RecordId;
                if (Varray[i].ThumbNailDefaultUrl.Length > 0)
                {
                    this._uriList = new(Varray[i].ThumbNailDefaultUrl);
                }
                if (Varray[i].ThumbNailStandardUrl.Length > 0)
                {
                    this._uriList = new(Varray[i].ThumbNailStandardUrl);
                }
                if (Varray[i].ThumbNailMediumUrl.Length > 0)
                {
                    this._uriList = new(Varray[i].ThumbNailMediumUrl);
                }
                if (Varray[i].ThumbNailHighUrl.Length > 0)
                {
                    this._uriList = new(Varray[i].ThumbNailHighUrl);
                }
                if (Varray[i].ThumbNailMaxresUrl.Length > 0)
                {
                    this._uriList = new(Varray[i].ThumbNailMaxresUrl);
                }
                var path = Path.Combine(record.VideoId, WebtubeRecord.VideoListId);
                await DownloadImageAsync(this._uriList, path);
            }
            record.WebTubeSeries = Varray.ToList();
            try
            {
                _context.WebTubes.Add(record);
                await _context.SaveChangesAsync();

            }
            catch (Exception e)
            {
                throw new ApplicationException(e.Message);
            }
            return await _context.WebTubes
                .Where(i => i.RecordId == record.RecordId)
                .SingleAsync();
        }

        public async Task DownloadImageAsync(Uri uri, string videoList)
        {
            if (uri == null)
            {
                return;
            }
            if (_appSettings.Value.Download != "Yes")
            {
                return;
            }
            // Get the file extension
            //var uriWithoutQuery = uri.GetLeftPart(UriPartial.Path);
            //var fileExtension = Path.GetExtension(uriWithoutQuery);
            var segLength = uri.Segments.Length;
            var fileName = uri.Segments[segLength - 2] + "-" + uri.Segments[segLength - 1];
            fileName = fileName.Replace("/", "");
            // Create file path and ensure directory exists
            //var path = Path.Combine(directoryPath, $"{fileName}{fileExtension}");
            var path = Path.Combine(_mediaPosterDrive, videoList);
            Directory.CreateDirectory(path);
            path = Path.Combine(path, $"{fileName}");

            //
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, uri);
            var httpResponse = await _httpClient.SendAsync(httpRequestMessage);
            var imageBytes = await httpResponse.Content.ReadAsStreamAsync();
            using var fileStream = new FileStream(path, FileMode.Create);
            await imageBytes.CopyToAsync(fileStream);
        }
        public async Task<Boolean> DelWebTube(Guid id)
        {
            //Guid id = new Guid("5a88a3e1-5051-449d-90ee-28fd535275b5");
            WebTube record = new();
            try
            {
                record = await _context.WebTubes
                   .Where(i => i.RecordId == id)
                   .SingleAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException(e.Message);
            }
            _context.WebTubes.Remove(record);
            _context.SaveChanges();

            return true;
        }
        private async Task<bool> DownloadVideo(YTDownload record)
        {
            var youtube = new YoutubeClient();
            var video = await youtube.Videos.GetAsync(record.youtubeUrl);
            var designatedPath = record.updatePath;
            string sanitizedTitle = string.Join("_", video.Title.Split(Path.GetInvalidFileNameChars()));
            var mediaPath = Path.Combine(_mediaDrive, designatedPath);
            Directory.CreateDirectory(mediaPath);
            var pathClosedCaption = Path.Combine(mediaPath, "CLOSEDCAPTION");
            var streamManifest = await youtube.Videos.Streams.GetManifestAsync(video.Id);

            var audioStream = streamManifest.GetAudioOnlyStreams().GetWithHighestBitrate();
            var stream = await youtube.Videos.Streams.GetAsync(audioStream);

            var videoStream = streamManifest
                .GetVideoOnlyStreams()
                //.Where(s => s.Container == Container.Mp4)
                .GetWithHighestVideoQuality();

            /* Closed Caption */
            var trackManifest = await youtube.Videos.ClosedCaptions.GetManifestAsync(record.youtubeUrl);
            if (trackManifest.Tracks.Count != 0)
            {
                ClosedCaptionTrackInfo trackInfo;
                try
                {
                    trackInfo = trackManifest.GetByLanguage("en-US");
                }
                catch
                {
                    try
                    {
                        trackInfo = trackManifest.GetByLanguage("en");
                    }
                    catch
                    {
                        trackInfo = null;
                    }
                }
                if (trackInfo != null)
                {
                    Directory.CreateDirectory(pathClosedCaption);
                    var track = await youtube.Videos.ClosedCaptions.GetAsync(trackInfo);
                    if (track != null)
                    {
                        var fileWithPath = Path.Combine(pathClosedCaption, sanitizedTitle + @".srt");
                        await youtube.Videos.ClosedCaptions.DownloadAsync(trackInfo, fileWithPath);
                    }
                }
            }
            /* End of Closed Caption */

            if ((stream is null) || (videoStream is null))
            {
                return false;
            }
            var mediaFileWithPath = Path.Combine(mediaPath, sanitizedTitle + @"." + videoStream.Container.Name);
            var streamInfos = new IStreamInfo[] { audioStream, videoStream };
            await youtube.Videos.DownloadAsync(streamInfos, new ConversionRequestBuilder(mediaFileWithPath).Build());


            // Download the Audio stream to a file
            //path = path + @"." + audioStream.Container.Name;
            //await youtube.Videos.Streams.DownloadAsync(audioStream, path);

            //// Download the Video stream to a file
            //pathV = pathV + @"." + videoStream.Container.Name;
            //await youtube.Videos.Streams.DownloadAsync(videoStream, pathV);
            return true;
        }
        public async Task<bool> DownloadYoutube(YTDownload record)
        {

            bool bResult = false;
            var playlistUrl = record.youtubeUrl;
            var videoList = record.videoList;
            if (videoList.Length > 0)
            {

                //int count = 0;
                var youtube = new YoutubeClient();
                var playlist = await youtube.Playlists.GetAsync(playlistUrl);

                await foreach (var video in youtube.Playlists.GetVideosAsync(playlistUrl))
                {
                    //count++;
                    //Console.WriteLine(count + " "+ video.Title);
                    YTDownload tmp = new()
                    {
                        youtubeUrl = @"https://www.youtube.com/watch?v=" + video.Id.Value,
                        updatePath = record.updatePath,
                        videoList = videoList,
                    };
                    bResult = await DownloadVideo(tmp);

                    if (!bResult)
                    {
                        break;
                    }
                }
            }
            else
            {
                bResult = await DownloadVideo(record);
            }
            return bResult;
        }
    }
}
