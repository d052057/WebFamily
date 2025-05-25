using System;

namespace WebFamily.Models
{
    public class menuType
    {
        public string menuId { get; set; } = string.Empty;
    }
    public class JsonMenu
    {
        public Guid RecordId { get; set; }
        public string Param { get; set; } = String.Empty;
        public string Title { get; set; } = String.Empty;
    }
    public class JsonDirectory
    {
        public Guid MenuId { get; set; }
        public Guid DirectoryId { get; set; }
        public string Directory { get; set; }
        public string Menu { get; set; }


    }
    public class MenuRecord: IMenuRecord
    {
        public int id { get; set; }
        public string title { get; set; } = String.Empty;
        public string param { get; set; } = String.Empty;
    }
    public class RenameFile : IrenameFile
    {
        public Guid recordId { get; set; }
        public string fromFolder { get; set; } = String.Empty;
        public string toFile { get; set; } = String.Empty;
    }
    public interface IMenuRecord
    {
        public int id { get; set; }
        public string title { get; set; }   
        public string param { get; set; }   

    }
    public interface IrenameFile
    {
        public Guid recordId { get; set; }
        public string fromFolder { get; set; }
        public string toFile { get; set; }

    }
}
