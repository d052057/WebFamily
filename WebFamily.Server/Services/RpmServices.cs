using Microsoft.EntityFrameworkCore;
using WebFamily.Server.Models;
namespace WebFamily.Server.Services
{
    public interface IRpmServices
    {
        Task<IEnumerable<Rpm>> GetRpms();
        Task<IEnumerable<Rpm>> GetRpmMenu();
        Task<IEnumerable<RpmTrack>> GetRpmTracks(Guid RecordId);
    }
    public class RpmServices : IRpmServices
    {
        private readonly WebFamilyDbContext _context;
        public RpmServices(WebFamilyDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Rpm>> GetRpms()
        {
            IEnumerable<Rpm> record = await _context.Rpms
                // Unparsed tracks (TrackNumber null) sort after every real
                // track number rather than disappearing to the top.
                .Include(p => p.RpmTracks.OrderBy(s => s.TrackNumber ?? int.MaxValue).ThenBy(s => s.Title))
                .OrderBy(s => s.Title)
                .ToListAsync();
            
            return record;

        }
        public async Task<IEnumerable<Rpm>> GetRpmMenu()
        {
            IEnumerable<Rpm> record = await _context.Rpms
                .OrderBy(s => s.Title)
                .ToListAsync();
            return record;

        }
        public async Task<IEnumerable<RpmTrack>> GetRpmTracks(Guid RecordId)
        {
            IEnumerable<RpmTrack> record = await _context.RpmTracks
                .Where(s => s.RpmId == RecordId)
                .OrderBy(s => s.TrackNumber ?? int.MaxValue)
                .ThenBy(s => s.Title)
                .ToListAsync();
            return record;

        }
    }
}
