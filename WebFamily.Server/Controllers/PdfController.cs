using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Controllers
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
            if (string.IsNullOrWhiteSpace(pathFolder) || string.IsNullOrWhiteSpace(filename))
            {
                return BadRequest("pathFolder and filename are required");
            }

            string fullpathFile = Path.GetFullPath(Path.Combine(_pdfPath, pathFolder, filename));
            string basePath = Path.GetFullPath(_pdfPath);

            // Ensure the resolved path stays within the intended base folder
            if (!fullpathFile.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Invalid path");
            }

            if (!System.IO.File.Exists(fullpathFile))
            {
                return NotFound();
            }

            byte[] bytes = System.IO.File.ReadAllBytes(fullpathFile);
            return File(bytes, "application/pdf");
        }
    }
}
