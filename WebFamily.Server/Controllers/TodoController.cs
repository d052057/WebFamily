using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebFamily.Server.Models;
using WebFamily.Server.Services;

namespace WebFamily.Server.Controllers
{
    [Authorize(Policy = "AdminPolicy")]
    [Route("api/[controller]")]
    [ApiController]
    public class TodoController : ControllerBase
    {
        private readonly ITodoServices _todoServices;
        public TodoController(ITodoServices todoServices)
        {
            _todoServices = todoServices;
        }

        [AllowAnonymous]
        [HttpGet("GetTodoList")]
        public async Task<IEnumerable<TodoList>> GetTodoList()
        {
            return await _todoServices.GetTodoList();

        }
        [HttpPost("AddTodo")]
        public async Task<ActionResult<TodoList>> AddTodo([FromBody] TodoList TodoRecord)
        {
            return await _todoServices.AddTodo(TodoRecord);
        }
        [HttpDelete]
        [Route("DeleteTodo/{id}")]
        public async Task<ActionResult> DeleteTodo([FromRoute] Guid id)
        {
            bool deleted = await _todoServices.DeleteTodo(id) ;
            if (deleted)
            {
                return Ok(new { message = "Todo record deleted successfully" });
            }
            else
            {
                return BadRequest();
            }
        }

        [HttpPut("UpdateTodo")]
        public async Task<ActionResult> UpdateTodo([FromBody] TodoList TodoRecord)
        {
            TodoList Record = await _todoServices.UpdateTodo(TodoRecord);
            return Ok(Record);
        }
    }
}
