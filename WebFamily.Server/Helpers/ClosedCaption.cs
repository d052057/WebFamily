using System.IO;

namespace WebFamily.Server.Helpers;
public class ClosedCaption
{
    public string Get(string file)
    {
        var folder = Path.GetDirectoryName(file);
        var fileWithNoExt = Path.GetFileNameWithoutExtension(file);
        var cc = folder + @"\closecaption\" + fileWithNoExt + @".en.vtt";
        string result = "";
        if (File.Exists(cc))
        {
            result = fileWithNoExt + @".en.vtt";
        }
        else
        {
            cc = folder + @"\closecaption\" + fileWithNoExt + @".srt";
            if (File.Exists(cc))
            {
                result = fileWithNoExt + @".srt";
            }
        }
        return result;
    }
}
