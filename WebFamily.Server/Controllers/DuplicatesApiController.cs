using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers;

public record MediaFileDto(long Id, string FileName, string FullPath, string? Sha256, bool IsPhoto, DateTime LastWriteUtc);
// ContentStatus: identical (all same hash) | partial (some share a hash) | different (no two match) | pending (not all hashed)
public record DuplicateGroupDto(long SizeBytes, string ContentStatus, List<MediaFileDto> Files);
public record GroupCounts(int All, int Same, int Different, int Pending);
public record DuplicatesPageDto(string MediaRoot, string? Q, string Mode, int Page, int TotalPages, int TotalGroups, GroupCounts Counts, List<DuplicateGroupDto> Groups);

[ApiController]
[Route("api/duplicates")]
// TODO: re-enable before deploying: [Authorize] (or [Authorize(Roles = "Admin")])
public class DuplicatesApiController : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider Mime = new();
    private readonly WebFamilyDbContext _db;
    private readonly MediaScanner _scanner;
    private readonly MediaScanJob _job;            // runs scans in the background
    private readonly DuplicateScanSettings _cfg;   // ApplicationSettings:DuplicateScan

    public DuplicatesApiController(WebFamilyDbContext db, MediaScanner scanner, MediaScanJob job, IOptions<ApplicationSettings> app)
    {
        _db = db;
        _scanner = scanner;
        _job = job;
        _cfg = app.Value.DuplicateScan;
    }

    /// mode: all | same (at least one identical pair) | different (same size, no matching hash) | pending (hash not computed yet)
    [HttpGet]
    public async Task<ActionResult<DuplicatesPageDto>> Get([FromQuery] string? q, [FromQuery] string? mode, [FromQuery] int page = 1)
    {
        q = q?.Normalize(NormalizationForm.FormC).Trim(); // consistent Khmer composition
        mode = mode?.ToLowerInvariant() switch { "same" => "same", "different" => "different", "pending" => "pending", _ => "all" };

        var active = _db.MediaFiles.AsNoTracking()
            .Where(f => f.Status == EnuMediaFileStatus.Active && f.SizeBytes >= _cfg.MinFileSizeBytes);

        var groups = active.GroupBy(f => f.SizeBytes).Where(g => g.Count() > 1)
            .Select(g => new
            {
                Size = g.Key,
                FirstName = g.Min(x => x.FileName),
                Total = g.Count(),
                Hashed = g.Count(x => x.Sha256 != null),
                Distinct = g.Select(x => x.Sha256).Distinct().Count()
            });

        if (!string.IsNullOrEmpty(q))
        {
            var pattern = "%" + q.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("[", "\\[") + "%";
            // CI collation on the columns makes LIKE case-insensitive
            var matchSizes = active.Where(f => EF.Functions.Like(f.FileName, pattern, "\\")
                                            || EF.Functions.Like(f.FullPath, pattern, "\\"))
                                   .Select(f => f.SizeBytes);
            groups = groups.Where(g => matchSizes.Contains(g.Size));
        }

        // counts for the toggle buttons (respect the search box, ignore the mode)
        var counts = new GroupCounts(
            await groups.CountAsync(),
            await groups.CountAsync(g => g.Hashed == g.Total && g.Distinct < g.Total),
            await groups.CountAsync(g => g.Hashed == g.Total && g.Distinct == g.Total),
            await groups.CountAsync(g => g.Hashed < g.Total));

        var filtered = mode switch
        {
            "same" => groups.Where(g => g.Hashed == g.Total && g.Distinct < g.Total),
            "different" => groups.Where(g => g.Hashed == g.Total && g.Distinct == g.Total),
            "pending" => groups.Where(g => g.Hashed < g.Total),
            _ => groups
        };
        var total = mode switch { "same" => counts.Same, "different" => counts.Different, "pending" => counts.Pending, _ => counts.All };

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)_cfg.PageSize));
        page = Math.Clamp(page, 1, totalPages);

        var sizes = await filtered.OrderBy(g => g.FirstName).ThenBy(g => g.Size)
                                  .Skip((page - 1) * _cfg.PageSize).Take(_cfg.PageSize).Select(g => g.Size).ToListAsync();

        var files = await active.Where(f => sizes.Contains(f.SizeBytes)).OrderBy(f => f.FileName).ToListAsync();

        var dto = sizes.Select(s =>
        {
            var list = files.Where(f => f.SizeBytes == s).ToList();
            return new DuplicateGroupDto(s, StatusOf(list),
                list.Select(f => new MediaFileDto(f.Id, f.FileName, f.FullPath, f.Sha256, f.IsPhoto, f.LastWriteUtc)).ToList());
        }).OrderBy(g => g.Files[0].FileName).ToList();

        return new DuplicatesPageDto(_scanner.Root, q, mode, page, totalPages, total, counts, dto);
    }

    private static string StatusOf(List<MediaFileRecord> list)
    {
        if (list.Any(f => f.Sha256 == null)) return "pending";
        var distinct = list.Select(f => f.Sha256).Distinct().Count();
        return distinct == 1 ? "identical" : distinct < list.Count ? "partial" : "different";
    }

    /// Starts a background scan and returns at once (202). 409 if one is already running.
    [HttpPost("scan")]
    public IActionResult StartScan() =>
        _job.TryStart() ? Accepted(_job.Status) : Conflict(_job.Status);

    /// Progress for the page to poll.
    [HttpGet("scan/status")]
    public ActionResult<ScanStatus> GetScanStatus() => _job.Status;

    [HttpPost("scan/cancel")]
    public IActionResult CancelScan()
    {
        _job.Cancel();
        return Accepted(_job.Status);
    }

    // NOTE: <img src> cannot send an Authorization header, so the Angular client fetches photos as blobs.
    [HttpGet("photo/{id:long}")]
    public async Task<IActionResult> Photo(long id)
    {
        var f = await _db.MediaFiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsPhoto && x.Status == EnuMediaFileStatus.Active);
        if (f == null) return NotFound();

        var full = Path.GetFullPath(f.FullPath);
        var root = Path.GetFullPath(_scanner.Root).TrimEnd('\\') + "\\";
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(full)) return NotFound();

        if (!Mime.TryGetContentType(full, out var ct)) ct = "application/octet-stream";
        return PhysicalFile(full, ct, enableRangeProcessing: true);
    }

    /// Moves the file to the review folder and updates the DB.
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        try { return Ok(new { movedTo = await _scanner.QuarantineAsync(id, User.Identity?.Name) }); }
        catch (Exception ex) { return Problem(ex.Message, statusCode: 400); }
    }
}
