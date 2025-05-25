using System;

namespace WebFamily.Models
{
    public class MetaDataInfo
    {
        //public MetaDataInfo()
        //{
        //    FullPath = "";
        //    FullFileName = "";
        //    Duration = TimeSpan.Zero;
        //    MimeType = "";
        //}
        public string FullPath { get; set; } = String.Empty;    
        public string FullFileName { get; set; } = String.Empty;
        public System.TimeSpan Duration { get; set; } = TimeSpan.Zero;
        public string MimeType { get; set; } = String.Empty;
    }
}
