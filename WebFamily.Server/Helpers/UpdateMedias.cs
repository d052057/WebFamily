//using Shell32;
//using System;
//using System.Collections.Generic;
//using System.IO;
//using System.Linq;
using WebFamily.Models;
namespace WebFamily.Helpers
{
    public class UpdateMedias
    {
        private readonly WebFamilyDbContext _context;
        private readonly MetaDataInfo metaDataInfoObj = new();
        MenuData MenuDataRecord = new();
        List<string> loopExceptions = [];
        public UpdateMedias(WebFamilyDbContext context)
        {
            _context = context;
        }
        public List<string> Update(string FullPath, string msgType)
        {
            List<Models.MetaDataInfo> listFiles = new();
            string Folder = FullPath.TrimEnd(Path.DirectorySeparatorChar).Split(Path.DirectorySeparatorChar).Last();
            // list directory inside FullPath directory
            List<string> listDir = [.. Directory.GetDirectories(FullPath)];
            MenuDataRecord.MenuName = Folder;
            if (GetMenuRecordId(Folder))
            {
                ClosedCaption closedCaptionObj = new();
                bool closeCaption;
                foreach (string subFolder in listDir)
                {
                    string thisFolder = subFolder.TrimEnd(Path.DirectorySeparatorChar).Split(Path.DirectorySeparatorChar).Last();
                    if (GetDirectoryRecordId(thisFolder))
                    {
                        closeCaption = false;
                        if (Directory.Exists(subFolder + @"\closeCaption"))
                        {
                            closeCaption = true;
                        }
                        listFiles = metaDataInfoObj.SingleLevelDir(subFolder);
                        if (listFiles.Count > 0)
                        {

                            try
                            {
                                _context.MediaMetaData
                                    .RemoveRange(
                                    _context.MediaMetaData
                                    .Where(x => x.DirectoryId == MenuDataRecord.DirectoryRecordId)
                                    );
                                _context.SaveChanges();
                                //
                                foreach (Models.MetaDataInfo lf in listFiles)
                                {
                                    MediaMetaDatum metaData = new();
                                    metaData.DirectoryId = MenuDataRecord.DirectoryRecordId;
                                    metaData.RecordId = Guid.NewGuid();
                                    metaData.Type = lf.MimeType;
                                    metaData.Title = lf.FullFileName;
                                    metaData.Duration = lf.Duration.ToString(@"hh\:mm\:ss");
                                    if (closeCaption)
                                    {
                                        // static class - no need to define new();
                                        metaData.Caption = closedCaptionObj.Get(lf.FullPath + @"\" + lf.FullFileName);
                                    }
                                    else
                                    {
                                        metaData.Caption = string.Empty;
                                    }
                                    _ = _context.Add(metaData);

                                }
                                _context.SaveChanges();
                            }
                            catch (Exception e)
                            {
                                loopExceptions.Add("SQL update error:" + e.Message);
                                throw new ApplicationException(e.Message);
                                //return e.Message;
                            }
                        }
                    }

                }
            }
            loopExceptions.Add("Process Complete:" + EnumMsg.Get(msgType));
            return loopExceptions;
        }
        private Boolean GetMenuRecordId(string Menu)
        {
            var record = new MediaMenu();
            record = _context.MediaMenus.Single(x => x.Menu == Menu);
            if (record == null)
            {
                return false;
            }
            MenuDataRecord.MenuName = record.Menu;
            MenuDataRecord.MenuRecordId = record.RecordId;
            return true;
        }
        private Boolean GetDirectoryRecordId(string dir)
        {
            var record = new MediaDirectory();
            if (_context.MediaDirectories.Any(x => (x.Directory == dir && x.MenuId == MenuDataRecord.MenuRecordId)))
            {
                record = _context.MediaDirectories.Single(x => (x.Directory == dir && x.MenuId == MenuDataRecord.MenuRecordId));
                MenuDataRecord.DirectoryRecordId = record.RecordId;
                MenuDataRecord.DirectoryName = record.Directory;
                return true;
            }
            else
            {
                loopExceptions.Add("Not Process Folder:" + dir + ". It is not existed in MediaDirectory table");
                return false;
            }
        }
    }

}
