using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
//using System.IO;
using WebFamily.Helpers;
//using WebFamily.Services;

namespace WebFamily.Controllers
{
    [ApiController]
    [Route("[controller]/[action]")]
    public class PdfController : Controller
    {
        private readonly IOptions<ApplicationSettings> _appSettings;
        private string _pdfPath;
        private readonly IWebHostEnvironment _env;
        public PdfController(
            IOptions<ApplicationSettings> appSettings,
            IWebHostEnvironment env
        )
        {
            _env = env;
            _appSettings = appSettings;
            _pdfPath = Path.Combine(appSettings.Value.MediaDrive, appSettings.Value.AssetBookFolder);
        }

        [HttpGet]
        //[Route("GetMyPdf")]
        public IActionResult GetMyPdf(string pathFolder, string filename)
        {
            string fullpathFile = Path.Combine(_pdfPath, pathFolder, filename);

            byte[] bytes = (System.IO.File.ReadAllBytes(fullpathFile));
            return File(bytes, "application/pdf");
        }
    }
}
