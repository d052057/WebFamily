namespace WebFamily.Server.DTOs
{
    // Only put values here that are safe to expose publicly (they end up
    // in a network response readable by anyone, same as they were
    // previously baked into the Angular JS bundle). Never put secrets
    // (client secrets, API keys meant to stay server-side, etc.) here.
    public class PublicClientSettingsDto
    {
        public string GoogleClientId { get; set; } = string.Empty;
        public string GoogleMapsApiKey { get; set; } = string.Empty;
        public string YoutubeApiKey { get; set; } = string.Empty;
        public string FacebookAppId { get; set; } = string.Empty;
        public string MediaBasePath { get; set; } = string.Empty;
        public string PhotoFolder { get; set; } = string.Empty;
        public string RpmFolder { get; set; } = string.Empty;
        public string RpmCoverFolder { get; set; } = string.Empty;
    }
}
