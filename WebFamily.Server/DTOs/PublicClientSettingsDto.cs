namespace WebFamily.Server.DTOs
{
    // Only put values here that are safe to expose publicly (they end up
    // in a network response readable by anyone, same as they were
    // previously baked into the Angular JS bundle). Never put secrets
    // (client secrets, API keys meant to stay server-side, etc.) here.
    public class PublicClientSettingsDto
    {
        public string GoogleClientId { get; set; } = string.Empty;
    }
}
