namespace WebFamily.Server.Models;

public partial class MenuDataRecord
{
    public Guid MenuRecordId { get; set; }
    public string MenuName { get; set; }
    public Guid DirectoryRecordId { get; set; }
    public string DirectoryName { get; set; }
}

