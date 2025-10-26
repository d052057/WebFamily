import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoRoutingModule } from './todo-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { TodoComponent } from './todo.component';
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TodoRoutingModule,
    ReactiveFormsModule,
    TodoComponent
  ]
})
export class TodoModule { }
