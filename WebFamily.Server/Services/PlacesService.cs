// Services/IPlacesService.cs
using System.Text.Json;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services
{
    public interface IPlacesService
    {
        Task<ApiResponse<UserProfile>> GetUserPlacesAsync(string userId, string userName, string userEmail);
        Task<ApiResponse<SavedPlace>> SavePlaceAsync(string userId, string userName, string userEmail,  SavePlaceRequest request);
        Task<ApiResponse<bool>> RemovePlaceAsync(string userId, string placeId);
        Task<ApiResponse<UserProfile>> InitializeDefaultUserAsync(string userId, string userName, string userEmail);
    }
    public class PlacesService : IPlacesService
    {
        private readonly string _dataPath;
        private readonly ILogger<PlacesService> _logger;

        public PlacesService(ILogger<PlacesService> logger)
        {
            _logger = logger;
            _dataPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "places");
            EnsureDataDirectoryExists();
            EnsureDefaultPlacesExists();
        }

        public async Task<ApiResponse<UserProfile>> GetUserPlacesAsync(string userId, string userName, string userEmail)
        {
            try
            {
                string filePath = GetUserFilePath(userId);

                if (!File.Exists(filePath))
                {
                    // Create new user profile from default places
                    return await InitializeDefaultUserAsync(userId, userName, userEmail);
                }

                string jsonContent = await File.ReadAllTextAsync(filePath);
                var userProfile = JsonSerializer.Deserialize<UserProfile>(jsonContent, GetJsonOptions());

                return new ApiResponse<UserProfile>
                {
                    Success = true,
                    Message = "User places retrieved successfully",
                    Data = userProfile
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user places for userId: {UserId}", userId);
                return new ApiResponse<UserProfile>
                {
                    Success = false,
                    Message = $"Error retrieving user places: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<SavedPlace>> SavePlaceAsync(string userId, string userName, string userEmail, SavePlaceRequest request)
        {
            try
            {
                var userProfileResponse = await GetUserPlacesAsync(userId, userName, userEmail);
                if (!userProfileResponse.Success || userProfileResponse.Data == null)
                {
                    return new ApiResponse<SavedPlace>
                    {
                        Success = false,
                        Message = "Could not retrieve user profile"
                    };
                }

                var newPlace = new SavedPlace
                {
                    Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
                    Name = request.Name,
                    Address = request.Address,
                    Lat = request.Lat,
                    Lng = request.Lng,
                    Type = request.Type,
                    DateAdded = DateTime.UtcNow
                };

                userProfileResponse.Data.SavedPlaces.Add(newPlace);

                await SaveUserProfileAsync(userId, userProfileResponse.Data);

                return new ApiResponse<SavedPlace>
                {
                    Success = true,
                    Message = "Place saved successfully",
                    Data = newPlace
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving place for userId: {UserId}", userId);
                return new ApiResponse<SavedPlace>
                {
                    Success = false,
                    Message = $"Error saving place: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<bool>> RemovePlaceAsync(string userId, string placeId)
        {
            try
            {
                var userProfileResponse = await GetUserPlacesAsync(userId,"","");
                if (!userProfileResponse.Success || userProfileResponse.Data == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Could not retrieve user profile"
                    };
                }

                var placeToRemove = userProfileResponse.Data.SavedPlaces.FirstOrDefault(p => p.Id == placeId);
                if (placeToRemove == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Place not found"
                    };
                }

                userProfileResponse.Data.SavedPlaces.RemoveAll(p => p.Id == placeId);
                await SaveUserProfileAsync(userId, userProfileResponse.Data);

                return new ApiResponse<bool>
                {
                    Success = true,
                    Message = "Place removed successfully",
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing place for userId: {UserId}, placeId: {PlaceId}", userId, placeId);
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = $"Error removing place: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<UserProfile>> InitializeDefaultUserAsync(string userId, string userName, string userEmail)
        {
            try
            {
                // Load default places
                var defaultPlaces = await GetDefaultPlacesAsync();

                var userProfile = new UserProfile
                {
                    Id = userId,
                    Name = userName,
                    Email = userEmail,
                    Picture = "https://via.placeholder.com/40",
                    SavedPlaces = defaultPlaces
                };

                await SaveUserProfileAsync(userId, userProfile);

                return new ApiResponse<UserProfile>
                {
                    Success = true,
                    Message = "User profile initialized successfully",
                    Data = userProfile
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default user: {UserId}", userId);
                return new ApiResponse<UserProfile>
                {
                    Success = false,
                    Message = $"Error initializing user: {ex.Message}"
                };
            }
        }

        private async Task<List<SavedPlace>> GetDefaultPlacesAsync()
        {
            try
            {
                string defaultFilePath = Path.Combine(_dataPath, "defaultplaces.json");
                if (File.Exists(defaultFilePath))
                {
                    string jsonContent = await File.ReadAllTextAsync(defaultFilePath);
                    var defaultProfile = JsonSerializer.Deserialize<UserProfile>(jsonContent, GetJsonOptions());
                    return defaultProfile?.SavedPlaces ?? new List<SavedPlace>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load default places, returning empty list");
            }

            return new List<SavedPlace>();
        }

        private async Task SaveUserProfileAsync(string userId, UserProfile userProfile)
        {
            string userDirectory = GetUserDirectory(userId);
            Directory.CreateDirectory(userDirectory);

            string filePath = GetUserFilePath(userId);
            string jsonContent = JsonSerializer.Serialize(userProfile, GetJsonOptions());
            await File.WriteAllTextAsync(filePath, jsonContent);
        }

        private string GetUserDirectory(string userId)
        {
            return Path.Combine(_dataPath, userId);
        }

        private string GetUserFilePath(string userId)
        {
            return Path.Combine(GetUserDirectory(userId), "places.json");
        }

        private void EnsureDataDirectoryExists()
        {
            if (!Directory.Exists(_dataPath))
            {
                Directory.CreateDirectory(_dataPath);
            }
        }

        private void EnsureDefaultPlacesExists()
        {
            string defaultFilePath = Path.Combine(_dataPath, "defaultplaces.json");
            if (!File.Exists(defaultFilePath))
            {
                var defaultUserProfile = new UserProfile
                {
                    Id = "default",
                    Name = "WebFamily User",
                    Email = "d052057@yahoo.com",
                    Picture = "https://via.placeholder.com/40",
                    SavedPlaces = new List<SavedPlace>
                    {
                        new SavedPlace
                        {
                            Id = "1",
                            Name = "Seattle Space Needle",
                            Address = "400 Broad St, Seattle, WA 98109",
                            Lat = 47.6205,
                            Lng = -122.3493,
                            Type = "landmark",
                            DateAdded = DateTime.UtcNow
                        },
                        new SavedPlace
                        {
                            Id = "2",
                            Name = "Pike Place Market",
                            Address = "85 Pike St, Seattle, WA 98101",
                            Lat = 47.6089,
                            Lng = -122.3403,
                            Type = "market",
                            DateAdded = DateTime.UtcNow
                        }
                    }
                };

                string jsonContent = JsonSerializer.Serialize(defaultUserProfile, GetJsonOptions());
                File.WriteAllText(defaultFilePath, jsonContent);
            }
        }

        private static JsonSerializerOptions GetJsonOptions()
        {
            return new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
        }
    }
}
