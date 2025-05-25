import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoService } from '../services/todo.service';
import { todoList } from '../models/todoList';
@Component({
  selector: 'app-todo-list',
  imports: [],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss'
})
export class TodoListComponent implements OnInit {
 public service = inject(TodoService);
  ngOnInit(): void {
    this.service.todoDataRS.value();
  }
  todoRecords = computed(() => this.service.todoDataRS.value())
}
