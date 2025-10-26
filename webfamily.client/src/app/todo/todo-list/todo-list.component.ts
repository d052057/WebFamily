import { Component, computed, inject, OnInit } from '@angular/core';

import { TodoService } from '../services/todo.service';
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
