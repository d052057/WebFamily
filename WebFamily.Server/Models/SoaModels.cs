namespace WebFamily.Server.Models
{
    public class SeoData
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Keywords { get; set; }
#pragma warning disable CS8632
        public string? Image { get; set; }
        public string? Type { get; set; }
        public Dictionary<string, string>? Languages { get; set; }
        public object? StructuredData { get; set; }
#pragma warning restore CS8632
    }

    public class SeoUpdateRequest
    {
        public string Key { get; set; }
        public SeoData Data { get; set; }
    }

    public class SeoDeleteRequest
    {
        public string Key { get; set; }
    }

    public class ApiResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
#pragma warning disable CS8632
        public object? Data { get; set; }
#pragma warning restore CS8632
    }
}