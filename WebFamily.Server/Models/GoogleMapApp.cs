namespace WebFamily.Server.Models
{
    public class SavedPlace
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string Type { get; set; } = string.Empty;
        public DateTime DateAdded { get; set; }
    }
    public class UserProfile
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Picture { get; set; } = string.Empty;
        public List<SavedPlace> SavedPlaces { get; set; } = new List<SavedPlace>();
    }
}