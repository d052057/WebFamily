using System.IO;

namespace WebFamily.Helpers;
public class ClosedCaption
{
    public string Get(string file)
    {
        var folder = Path.GetDirectoryName(file);
        var fileWithNoExt = Path.GetFileNameWithoutExtension(file);
        var cc = folder + @"\closecaption\" + fileWithNoExt + @".en.vtt";
        string result = "";
        if (System.IO.File.Exists(cc))
        {
            result = fileWithNoExt + @".en.vtt";
        }
        else
        {
            cc = folder + @"\closecaption\" + fileWithNoExt + @".srt";
            if (System.IO.File.Exists(cc))
            {
                result = fileWithNoExt + @".srt";
            }
        }
        return result;
    }
}
