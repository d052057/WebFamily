using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class SeoAdminController : ControllerBase
    {
        private readonly ISeoService _seoService;
        private readonly ILogger<SeoAdminController> _logger;

        public SeoAdminController(ISeoService seoService, ILogger<SeoAdminController> logger)
        {
            _seoService = seoService;
            _logger = logger;
        }

        /// <summary>
        /// Get all SEO data
        /// </summary>
        [HttpGet("all")]
        public async Task<IActionResult> GetAllSeoData()
        {
            try
            {
                var data = await _seoService.GetAllSeoDataAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all SEO data");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error retrieving SEO data"
                });
            }
        }

        /// <summary>
        /// Get SEO data by key
        /// </summary>
        [HttpGet("{key}")]
        public async Task<IActionResult> GetSeoDataByKey(string key)
        {
            try
            {
                var data = await _seoService.GetSeoDataByKeyAsync(key);

                if (data == null)
                {
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = $"SEO data not found for key: {key}"
                    });
                }

                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting SEO data for key: {key}");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error retrieving SEO data"
                });
            }
        }

        /// <summary>
        /// Create new SEO entry
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateSeoData([FromBody] SeoUpdateRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Key))
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Key is required"
                    });
                }

                if (request.Data == null)
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "SEO data is required"
                    });
                }

                var success = await _seoService.CreateSeoDataAsync(request.Key, request.Data);

                if (!success)
                {
                    return Conflict(new ApiResponse
                    {
                        Success = false,
                        Message = $"SEO entry with key '{request.Key}' already exists"
                    });
                }

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "SEO entry created successfully",
                    Data = request.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating SEO data for key: {request.Key}");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error creating SEO entry"
                });
            }
        }

        /// <summary>
        /// Update existing SEO entry
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> UpdateSeoData([FromBody] SeoUpdateRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Key))
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Key is required"
                    });
                }

                if (request.Data == null)
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "SEO data is required"
                    });
                }

                var success = await _seoService.UpdateSeoDataAsync(request.Key, request.Data);

                if (!success)
                {
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = $"SEO entry with key '{request.Key}' not found"
                    });
                }

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "SEO entry updated successfully",
                    Data = request.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating SEO data for key: {request.Key}");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error updating SEO entry"
                });
            }
        }

        /// <summary>
        /// Delete SEO entry
        /// </summary>
        [HttpDelete("delete")]
        public async Task<IActionResult> DeleteSeoData([FromBody] SeoDeleteRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Key))
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Key is required"
                    });
                }

                var success = await _seoService.DeleteSeoDataAsync(request.Key);

                if (!success)
                {
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = $"SEO entry with key '{request.Key}' not found"
                    });
                }

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "SEO entry deleted successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting SEO data for key: {request.Key}");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error deleting SEO entry"
                });
            }
        }

        /// <summary>
        /// Backup SEO data
        /// </summary>
        [HttpGet("backup")]
        public async Task<IActionResult> BackupSeoData()
        {
            try
            {
                var json = await _seoService.BackupSeoDataAsync();
                var bytes = System.Text.Encoding.UTF8.GetBytes(json);
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");

                return File(bytes, "application/json", $"seo-data-backup_{timestamp}.json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating backup");
                return StatusCode(500, new ApiResponse
                {
                    Success = false,
                    Message = "Error creating backup"
                });
            }
        }

        /// <summary>
        /// PUBLIC ENDPOINT - Get SEO metadata for Angular frontend
        /// (No authentication required)
        /// </summary>
        [AllowAnonymous]
        [HttpGet("public/metadata")]
        [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetPublicSeoMetadata()
        {
            try
            {
                var data = await _seoService.GetAllSeoDataAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public SEO metadata");
                return StatusCode(500, new { message = "Error retrieving SEO data" });
            }
        }
    }
}
