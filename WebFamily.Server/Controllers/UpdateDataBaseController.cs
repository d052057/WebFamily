//using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]

    public class UpdateDataBaseController : Controller
    {
        private readonly IUpdateDataBaseServices _updateDataBaseServices;
        public UpdateDataBaseController(IUpdateDataBaseServices updateDataBaseServices)
        {
            _updateDataBaseServices = updateDataBaseServices;
        }

        [HttpPut("UpdateMetaData")]
        public async Task<JsonResult> UpdateMetaData([FromBody] menuType Menu)
        {
            var result = await _updateDataBaseServices.UpdateMetaData(Menu.menuId);
            return new JsonResult(result);
        }
    }
}
