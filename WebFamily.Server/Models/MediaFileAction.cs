using System.ComponentModel.DataAnnotations;

namespace WebFamily.Server.Models
{
    public enum EnuMediaFileStatus : byte { Active = 0, Quarantined = 1, Missing = 2 }

    public partial class MediaFileAction
    {
        public long Id { get; set; }
        public long MediaFileId { get; set; }
        public MediaFileRecord? Media { get; set; }
        [MaxLength(30)] public string Action { get; set; } = "";
        [MaxLength(450)] public string FromPath { get; set; } = "";
        [MaxLength(450)] public string? ToPath { get; set; }
        [MaxLength(256)] public string? PerformedBy { get; set; }
        public DateTime PerformedUtc { get; set; }
    }
}
