using Newtonsoft.Json;
//using System.Collections.Generic;
//using System.IO;
using WebFamily.Models;
namespace WebFamily.Helpers;
public interface IUpdateJson
{
    public void Update(string mfolder, string menuFolder, string title, string fullpath);
    public void DeleteJsonData(string folderPath, string folder);
    public void UpdateJsonData(string updatePath, string JsonResult);

}
public class UpdateJson : IUpdateJson
{
    public UpdateJson() {
        }
    public void Update(string mfolder, string menuFolder, string title, string fullpath )
    {
        var folderName = Path.Combine(fullpath, mfolder);
        var folderPath = Path.Combine(folderName, "menu.json");
        bool Found;
        var jsonData = File.ReadAllText(folderPath);
        int hiValue = 0;
        var Jsonlist = JsonConvert.DeserializeObject<List<MenuRecord>>(jsonData) ?? new() ;
        Found = false;
        for (int i = 0; i < Jsonlist.Count; i++)
        {
            if (Jsonlist[i].id >= hiValue)
            {
                hiValue = Jsonlist[i].id + 10;
            }
            if (Jsonlist[i].param == menuFolder)
            {
                Found = true;
            }
        }
        if (!Found)
        {
            string[] parsedFolder = fullpath.Split(@"\");
            MenuRecord newItem = new()
            {
                id = hiValue,
                param = menuFolder,
                title = title
            };
            Jsonlist.Add(newItem);
            // sort menu
            Jsonlist.Sort((x, y) => x.title.CompareTo(y.title));
            // renumber id
            for (int i = 0; i < Jsonlist.Count; i++)
            {
                Jsonlist[i].id = i * 10;
            }

            string JsonResult = JsonConvert.SerializeObject(Jsonlist, Formatting.Indented);
            UpdateJsonData(folderPath, JsonResult);
        }

    }
    public void DeleteJsonData(string folderPath, string folder)
    {
        var jsonData = File.ReadAllText(folderPath);
        var Jsonlist = JsonConvert.DeserializeObject<List<MenuRecord>>(jsonData) ?? new();
        for (int i = Jsonlist.Count - 1; i >= 0; i--)
        {
            if (Jsonlist[i].param == folder)
            {
                Jsonlist.RemoveAt(i);
                i = 0;
            }
        }
        string JsonResult = JsonConvert.SerializeObject(Jsonlist, Formatting.Indented);
        UpdateJsonData(folderPath, JsonResult);
    }
    public void UpdateJsonData(string updatePath, string JsonResult)
    {
        if (File.Exists(updatePath))
        {
            File.Delete(updatePath);
            using var tw = new StreamWriter(updatePath, true);
            tw.WriteLine(JsonResult);
            tw.Flush();
            tw.Close();
        }
        else
        {
            using var tw = new StreamWriter(updatePath, true);
            tw.WriteLine(JsonResult);
            tw.Flush();
            tw.Close();

        }
    }
}


