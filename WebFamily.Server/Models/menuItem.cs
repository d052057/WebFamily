// Models/MenuItem.cs
using System.Text.Json.Serialization;

namespace WebFamily.Server.Models
{
    public class MenuItem
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("param")]
        public string Param { get; set; } = string.Empty;
    }

    public class MenuData
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;

        [JsonPropertyName("lastUpdated")]
        public DateTime LastUpdated { get; set; }

        [JsonPropertyName("items")]
        public List<MenuItem> Items { get; set; } = new List<MenuItem>();
    }

    public class MenuUpdateRequest
    {
        public string Action { get; set; } = string.Empty; // "add" or "remove"
        public MenuItem Item { get; set; }
        public int? ItemId { get; set; } // For remove operations
    }
}