using Microsoft.AspNetCore.Mvc;
//using System;
//using System.Collections.Generic;
//using System.Threading.Tasks;
using WebFamily.Models;
using WebFamily.Services;

namespace WebFamily.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class TodoController : ControllerBase
    {
        private readonly ITodoServices _todoServices;
        public TodoController(ITodoServices todoServices)
        {
            _todoServices = todoServices;
        }
        [HttpGet("GetTodoList")]
        public async System.Threading.Tasks.Task<IEnumerable<TodoList>> GetTodoList()
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