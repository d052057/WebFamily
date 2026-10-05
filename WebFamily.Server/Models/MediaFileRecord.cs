using System.ComponentModel.DataAnnotations;

namespace WebFamily.Server.Models
{

    public partial class MediaFileRecord
    {
        public long Id { get; set; }
        [MaxLength(450)] public string FullPath { get; set; } = "";
        [MaxLength(260)] public string FileName { get; set; } = "";
        [MaxLength(20)] public string Extension { get; set; } = "";
        public long SizeBytes { get; set; }
        [MaxLength(64)] public string? Sha256 { get; set; }
        public bool IsPhoto { get; set; }
        public DateTime LastWriteUtc { get; set; }
        public DateTime ScannedUtc { get; set; }
        public EnuMediaFileStatus Status { get; set; }
        [MaxLength(450)] public string? QuarantinePath { get; set; }
        public List<MediaFileAction> Actions { get; set; } = new();
    }
}
