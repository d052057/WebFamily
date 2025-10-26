// Controllers/PlacesController.cs
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;
using YoutubeExplode.Channels;

namespace WebFamily.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlacesController : ControllerBase
    {
        private readonly IPlacesService _placesService;
        private readonly ILogger<PlacesController> _logger;

        public PlacesController(IPlacesService placesService, ILogger<PlacesController> logger)
        {
            _placesService = placesService;
            _logger = logger;
        }

        /// <summary>
        /// Get all saved places for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>User profile with saved places</returns>
        [HttpGet("{userId}/name/{userName}/email/{userEmail}/places")]
        public async Task<IActionResult> GetPlaces(string userId, string userName, string userEmail)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID is required"
                });
            }

            var result = await _placesService.GetUserPlacesAsync(userId, userName, userEmail);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }

        /// <summary>
        /// Save a new place for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="request">Place information to save</param>
        /// <returns>Saved place information</returns>
        [HttpPost("{userId}/name/{userName}/email/{userEmail}/places")]
        public async Task<IActionResult> SavePlace(string userId,string userName, string userEmail, [FromBody] SavePlaceRequest request)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID is required"
                });
            }

            if (request == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Place information is required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Address))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Place name and address are required"
                });
            }

            var result = await _placesService.SavePlaceAsync(userId, userName, userEmail, request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }

        /// <summary>
        /// Remove a saved place for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="placeId">Place ID to remove</param>
        /// <returns>Success status</returns>
        [HttpDelete("{userId}/places/{placeId}")]
        public async Task<IActionResult> RemovePlace(string userId, string placeId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID is required"
                });
            }

            if (string.IsNullOrWhiteSpace(placeId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Place ID is required"
                });
            }

            var result = await _placesService.RemovePlaceAsync(userId, placeId);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
    }
}