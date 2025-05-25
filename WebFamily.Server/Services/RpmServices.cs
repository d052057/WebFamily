using WebFamily.Helpers;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebFamily.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
namespace WebFamily.Services
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
                .Include(p => p.RpmTracks.OrderBy(s => s.Title))
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
                .OrderBy(s => s.Title)
                .ToListAsync();
            return record;

        }
    }
}
