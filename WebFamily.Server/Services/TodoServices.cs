using Newtonsoft.Json;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebFamily.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
namespace WebFamily.Services
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
                throw new ApplicationException(e.Message);
            }
            return await _context.TodoLists
                .Where(i => i.RecordId == record.RecordId)
                .SingleAsync();
        }
        public async Task<Boolean> DeleteTodo(Guid id)
        {
            //Guid id = new Guid("5a88a3e1-5051-449d-90ee-28fd535275b5");
            TodoList record = new();
            try
            {
                record = await _context.TodoLists
                   .Where(i => i.RecordId == id)
                   .SingleAsync();
            }
            catch (Exception e)
            {
                throw new ApplicationException(e.Message);
            }
            _context.TodoLists.Remove(record);
            _context.SaveChanges();

            return true;
        }
        public async Task<TodoList> UpdateTodo(TodoList todoRecord)
        {
            TodoList Record = new();
            try
            {

                Record = _context.TodoLists
                .Where(i => i.RecordId == todoRecord.RecordId)
                .Single();
            }
            catch (Exception e)
            {
                throw new ApplicationException(e.Message);
            }

            Record.Note = todoRecord.Note;
            Record.DueDate = todoRecord.DueDate;
            Record.Assigned = todoRecord.Assigned;
            try
            {
                _context.Entry(Record).State = EntityState.Modified;
                _context.TodoLists.Update(Record);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new ApplicationException(ex.Message);
            }
            return Record;

        }
    }
}