using Microsoft.EntityFrameworkCore;
using WebFamily.Server.Models;
namespace WebFamily.Server.Services
{
    public interface ITodoServices
    {
        Task<IEnumerable<TodoList>> GetTodoList();
        Task<TodoList> AddTodo(TodoList todo);
        Task<TodoList> UpdateTodo(TodoList todoRecord);
        Task<Boolean> DeleteTodo(Guid id);
    }
    public class TodoServices : ITodoServices
    {
        private readonly WebFamilyDbContext _context;
        public TodoServices(WebFamilyDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<TodoList>> GetTodoList()
        {
            return await _context.TodoLists
                .OrderBy(s => s.DueDate)
                .ToListAsync();
        }

        public async Task<TodoList> AddTodo(TodoList todo)
        {
            TodoList record = new()
            {
                RecordId = Guid.NewGuid(),
                DueDate = todo.DueDate,
                Note = todo.Note,
                Assigned = todo.Assigned,
                DateTime = DateTime.Now
            };
            try
            {
                _context.TodoLists.Add(record);
                await _context.SaveChangesAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException("Failed to add todo item.", e);
            }
            // record already reflects the saved state; no need for a second round-trip
            return record;
        }
        public async Task<Boolean> DeleteTodo(Guid id)
        {
            TodoList record;
            try
            {
                record = await _context.TodoLists
                   .Where(i => i.RecordId == id)
                   .SingleAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException("Failed to find todo item to delete.", e);
            }

            try
            {
                _context.TodoLists.Remove(record);
                await _context.SaveChangesAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException("Failed to delete todo item.", e);
            }

            return true;
        }
        public async Task<TodoList> UpdateTodo(TodoList todoRecord)
        {
            TodoList record;
            try
            {
                record = await _context.TodoLists
                    .Where(i => i.RecordId == todoRecord.RecordId)
                    .SingleAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException("Failed to find todo item to update.", e);
            }

            record.Note = todoRecord.Note;
            record.DueDate = todoRecord.DueDate;
            record.Assigned = todoRecord.Assigned;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new ApplicationException("Failed to update todo item.", ex);
            }
            return record;
        }
    }
}
