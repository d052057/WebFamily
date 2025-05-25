namespace WebFamily.Models;

public partial class MenuData
{
    public Guid MenuRecordId { get; set; }
    public string MenuName { get; set; }
    public Guid DirectoryRecordId { get; set; }
    public string DirectoryName { get; set; }
}

