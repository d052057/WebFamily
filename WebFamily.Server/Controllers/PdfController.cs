using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;

namespace WebFamily.Server.Controllers
{
    [Authorize]
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
                return BadRequest("pathFolder and filename are required.");
            }

            // filename must be a bare file name with no directory component
            // (rejects "../../secrets.json", "/etc/passwd", "..\\x", etc.)
            string safeFileName = Path.GetFileName(filename);
            if (safeFileName != filename || pathFolder.Contains("..") || Path.IsPathRooted(pathFolder))
            {
                return BadRequest("Invalid path.");
            }

            // Resolve the final path and verify it still lands inside the
            // configured PDF folder. This is a defense-in-depth check on top
            // of the rejections above, in case of any traversal trick we
            // didn't anticipate.
            string basePath = Path.GetFullPath(_pdfPath + Path.DirectorySeparatorChar);
            string fullPathFile = Path.GetFullPath(Path.Combine(_pdfPath, pathFolder, safeFileName));

            if (!fullPathFile.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Invalid path.");
            }

            if (!System.IO.File.Exists(fullPathFile))
            {
                return NotFound();
            }

            byte[] bytes = System.IO.File.ReadAllBytes(fullPathFile);
            return File(bytes, "application/pdf");
        }
    }
}
