//using System.Runtime.InteropServices;
using Shell32;
//using Microsoft.Extensions.FileProviders;
//using System.Threading;
//using System.Collections.Generic;
//using System;
//using System.IO;
//using System.Linq;
namespace WebFamily.Helpers;

public interface IMetaDataInfo
{
    List<Models.MetaDataInfo> SingleLevelDir(string folder);
    List<Models.MetaDataInfo> MultipleLevelDir(string folder);
}
public class MetaDataInfo : IMetaDataInfo
{
    public List<Models.MetaDataInfo> list = new();

    public List<Models.MetaDataInfo> SingleLevelDir(string folder)
    {
        Thread thread = new(() =>
        {
            GetSingleLevelFiles(folder);
        });

#pragma warning disable CA1416 // Validate platform compatibility
        thread.SetApartmentState(ApartmentState.STA);
#pragma warning restore CA1416 // Validate platform compatibility
        thread.Start();
        thread.Join();

        return list;
    }

    private void GetSingleLevelFiles(String folder)
    {
        System.TimeSpan dur = TimeSpan.Zero;

        list.Clear();

        Shell shell = new();
        MimeType mimeTypeObj = new();
        Folder objFolder = shell.NameSpace(folder);
        var thisFolder = folder.TrimEnd(Path.DirectorySeparatorChar).Split(Path.DirectorySeparatorChar).Last();
        if (objFolder != null)
        {
            foreach (FolderItem2 item in objFolder.Items())
            {
                if (!(item.IsFolder || item.IsLink))
                {
                    if (item.ExtendedProperty("System.Media.Duration") != null)
                    {
                        dur = TimeSpan.FromSeconds(item.ExtendedProperty("System.Media.Duration") / 10000000);
                    }
                    else
                    {
                        dur = TimeSpan.Zero;
                    }
                    Models.MetaDataInfo md = new();

                    md.Duration = dur.Duration();
                    md.FullFileName = item.ExtendedProperty("name"); // name

                    md.FullPath = thisFolder;

                    md.MimeType = mimeTypeObj.Get(item.Path);
                    list.Add(md);

                }
            }

        }

    }
    public List<Models.MetaDataInfo> MultipleLevelDir(string folder)
    {
        var thread = new System.Threading.Thread(() =>
        {
            GetMultipleLevelFiles(folder);
        });

#pragma warning disable CA1416 // Validate platform compatibility
        thread.SetApartmentState(ApartmentState.STA);
#pragma warning restore CA1416 // Validate platform compatibility
        thread.Start();
        thread.Join();

        return list;
    }
    private void GetMultipleLevelFiles(string folder)
    {
        Shell shell = new();
        Folder objFolder = shell.NameSpace(folder);
        MimeType mimeTypeObj = new();
        TimeSpan dur = TimeSpan.Zero;
        foreach (FolderItem2 item in objFolder.Items())
        {

            if (item.IsFolder)
            {
                GetMultipleLevelFiles(item.Path);
            }
            else
            {
                if (!(item.IsLink))
                {
                    if (item.ExtendedProperty("System.Media.Duration") != null)
                    {
                        dur = TimeSpan.FromSeconds(item.ExtendedProperty("System.Media.Duration") / 10000000);
                    }
                    else
                    {
                        dur = TimeSpan.Zero;
                    }
                    Models.MetaDataInfo md = new();
                    md.Duration = dur.Duration();
                    md.FullFileName = item.ExtendedProperty("name");
                    md.FullPath = folder;
                    md.MimeType = mimeTypeObj.Get(item.Path);
                    list.Add(md);
                }
            }
        }
    }
}
