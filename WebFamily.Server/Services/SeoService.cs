using Newtonsoft.Json;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services
{
    public interface ISeoService
    {
        Task<Dictionary<string, SeoData>> GetAllSeoDataAsync();
        Task<SeoData?> GetSeoDataByKeyAsync(string key);
        Task<bool> CreateSeoDataAsync(string key, SeoData data);
        Task<bool> UpdateSeoDataAsync(string key, SeoData data);
        Task<bool> DeleteSeoDataAsync(string key);
        Task<string> BackupSeoDataAsync();
    }
    public class SeoService : ISeoService
    {
        private readonly ILogger<SeoService> _logger;
        private readonly string _seoFilePath;
        
        public SeoService(ILogger<SeoService> logger)
        {
            _logger = logger;
            _seoFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Data","Seo", "seo-data.json");

            // Ensure data directory exists
            EnsureDataDirectoryExists();
        }

        private void EnsureDataDirectoryExists()
        {
            var directory = Path.GetDirectoryName(_seoFilePath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Create empty file if it doesn't exist
            if (!File.Exists(_seoFilePath))
            {
                File.WriteAllText(_seoFilePath, "{}");
            }
        }

        public async Task<Dictionary<string, SeoData>> GetAllSeoDataAsync()
        {
            try
            {
                var json = await File.ReadAllTextAsync(_seoFilePath);
                var data = JsonConvert.DeserializeObject<Dictionary<string, SeoData>>(json);

                return data ?? new Dictionary<string, SeoData>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading SEO data file");
                return new Dictionary<string, SeoData>();
            }
        }

        public async Task<SeoData?> GetSeoDataByKeyAsync(string key)
        {
            var allData = await GetAllSeoDataAsync();
            return allData.ContainsKey(key) ? allData[key] : null;
        }

        public async Task<bool> CreateSeoDataAsync(string key, SeoData data)
        {
            try
            {
                var allData = await GetAllSeoDataAsync();

                // Check if key already exists
                if (allData.ContainsKey(key))
                {
                    _logger.LogWarning($"SEO key '{key}' already exists");
                    return false;
                }

                allData[key] = data;
                await SaveSeoDataAsync(allData);

                _logger.LogInformation($"Created SEO entry: {key}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating SEO data for key: {key}");
                return false;
            }
        }

        public async Task<bool> UpdateSeoDataAsync(string key, SeoData data)
        {
            try
            {
                var allData = await GetAllSeoDataAsync();

                // Check if key exists
                if (!allData.ContainsKey(key))
                {
                    _logger.LogWarning($"SEO key '{key}' not found");
                    return false;
                }

                allData[key] = data;
                await SaveSeoDataAsync(allData);

                _logger.LogInformation($"Updated SEO entry: {key}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating SEO data for key: {key}");
                return false;
            }
        }

        public async Task<bool> DeleteSeoDataAsync(string key)
        {
            try
            {
                var allData = await GetAllSeoDataAsync();

                if (!allData.ContainsKey(key))
                {
                    _logger.LogWarning($"SEO key '{key}' not found");
                    return false;
                }

                allData.Remove(key);
                await SaveSeoDataAsync(allData);

                _logger.LogInformation($"Deleted SEO entry: {key}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting SEO data for key: {key}");
                return false;
            }
        }

        public async Task<string> BackupSeoDataAsync()
        {
            try
            {

                var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "Data","Seo", "backups");
                if (!Directory.Exists(backupDir))
                {
                    Directory.CreateDirectory(backupDir);
                }

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupPath = Path.Combine(backupDir, $"seo-data-backup_{timestamp}.json");

                File.Copy(_seoFilePath, backupPath, true);

                _logger.LogInformation($"Created SEO data backup: {backupPath}");
                return await File.ReadAllTextAsync(backupPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating SEO data backup");
                throw;
            }

        }

        private async Task SaveSeoDataAsync(Dictionary<string, SeoData> data)
        {
            //var options = new JsonSerializerOptions
            //{
            //    WriteIndented = true,
            //    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            //};

            var json = JsonConvert.SerializeObject(data);
            await File.WriteAllTextAsync(_seoFilePath, json);
        }
    }
}
