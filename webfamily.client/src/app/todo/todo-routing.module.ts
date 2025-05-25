import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./todo.component')
      .then(mod => mod.TodoComponent),
      children: [
        {
          path: 'todo-list',
          loadComponent: () => import('./todo-list/todo-list.component')
            .then(mod => mod.TodoListComponent)
        },
        {
          path: 'todo-maint',
          loadComponent: () => import('./todomaint/todomaint.component')
            .then(mod => mod.TodoMaintComponent)
        }
      ]
  },
  {
    path: 'todo-list',
    loadComponent: () => import('./todo-list/todo-list.component')
      .then(mod => mod.TodoListComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TodoRoutingModule { }
