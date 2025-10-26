using System;

namespace WebFamily.Server.Models
{
    public class MetaDataInfo
    {
        public string FullPath { get; set; } = string.Empty;    
        public string FullFileName { get; set; } = string.Empty;
        public TimeSpan Duration { get; set; } = TimeSpan.Zero;
        public string MimeType { get; set; } = string.Empty;
    }
}
