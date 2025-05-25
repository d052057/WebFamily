//using System;
//using System.Collections.Generic;
//using System.IO;
//using System.Linq;
using WebFamily.Models;
namespace WebFamily.Helpers
{
    public class UpdateSongs
    {
        private readonly WebFamilyDbContext _context;
        private readonly MetaDataInfo metaDataInfoObj = new();
        public UpdateSongs(WebFamilyDbContext context)
        {
            _context = context;
        }
        public List<string> Update(string FullPath)
        {
            Guid directoryId;
            MediaDirectory rec = new();
            List<Models.MetaDataInfo> listFiles = new();
            List<string> loopListException = new();
            string thisFolder = FullPath.TrimEnd(Path.DirectorySeparatorChar).Split(Path.DirectorySeparatorChar).Last();
            try
            {
                rec = _context.MediaDirectories.Single(e => e.Directory == thisFolder);
            }
            catch (Exception ex)
            {
                loopListException.Add("Folder not Process:" + thisFolder + " (" + ex.Message + ")");
                //throw new ApplicationException(ex.Message);
            }
            finally
            {
                directoryId = rec.RecordId;
            }
            listFiles = metaDataInfoObj.MultipleLevelDir(FullPath);
            if (listFiles.Count > 0)
            {

                try
                {
                    _context.MediaMetaData
                        .RemoveRange(
                        _context.MediaMetaData
                        .Where(x => x.DirectoryId == directoryId)
                        );
                    _context.SaveChanges();

                    foreach (Models.MetaDataInfo lf in listFiles)
                    {
                        MediaMetaDatum metaData = new();
                        metaData.DirectoryId = directoryId;
                        metaData.RecordId = Guid.NewGuid();
                        metaData.Type = lf.MimeType;
                        metaData.Title = (lf.FullPath + @"\" + lf.FullFileName).Substring(FullPath.Length + 1);
                        metaData.Duration = lf.Duration.ToString(@"hh\:mm\:ss");

                        metaData.Caption = string.Empty;
                        _context.Add(metaData);

                    }
                    _ = _context.SaveChanges();
                }
                catch (Exception e)
                {
                    loopListException.Add("Update Database Error:" + e.Message);
                    throw new ApplicationException(e.Message);
                }
            }
            //
            loopListException.Add("Complete process:" + EnumMsg.EnumMessageUpdate.EnglishSong.ToString());
            return loopListException;
        }
    }
}
