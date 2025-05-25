//using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Models;
using WebFamily.Services;

namespace WebFamily.Controllers
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
        public JsonResult UpdateMetaData([FromBody] menuType Menu)
        {
            return new JsonResult(_updateDataBaseServices.UpdateMetaData(Menu.menuId));
        }
    }
}
