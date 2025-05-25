using AutoMapper;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using WebFamily.Models;

namespace WebFamily.Helpers;
public class UpdateRPM
{
    private readonly WebFamilyDbContext _context;
    public List<Models.MetaDataInfo> FilesList = new();
    public UpdateRPM(WebFamilyDbContext context)
    {
        _context = context;
    }
    //
    public List<string> Update(string FullPath, string CoverPath)
    {
        _context.Rpms.RemoveRange(_context.Rpms);
        _context.SaveChanges();
        MetaDataInfo metaDataInfoObj = new();
        MimeType mimeTypeObj = new();
        List<string> coverFiles = Directory.EnumerateFiles(CoverPath, "*.*").OrderBy(filename => filename).ToList();
        List<string> loopListException = new List<string>();
        foreach (string currentFile in coverFiles)
        {
            string file = Path.GetFileNameWithoutExtension(currentFile);

            List<Models.MetaDataInfo> trackList = metaDataInfoObj.SingleLevelDir(Path.Combine(FullPath, file));
            Rpm rpm = new();
            rpm.RecordId = new();
            rpm.Title = Path.GetFileName(currentFile);
            rpm.Type = mimeTypeObj.Get(currentFile);
            List<RpmTrack> rpmTrackList = new();
            foreach (Models.MetaDataInfo rpmFile in trackList)
            {
                RpmTrack t = new();
                t.RecordId = new();
                t.RpmId = rpm.RecordId;
                t.Title = rpmFile.FullFileName;
                rpm.AudioType = rpmFile.MimeType;
                t.Duration = rpmFile.Duration.ToString(@"hh\:mm\:ss");
                rpmTrackList.Add(t);
            }
            rpm.RpmTracks = rpmTrackList;
            try
            {
                _context.Rpms.Add(rpm);
                _context.SaveChanges();
            }
            catch (Exception e)
            {
                loopListException.Add("Error exception:" + e.Message);
            }
        }
        loopListException.Add("Process :" + EnumMsg.Get(EnumMsg.EnumMessageUpdate.Rpm.ToString()));
        return loopListException;
    }
}
