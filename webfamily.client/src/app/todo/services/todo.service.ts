import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { todoDisplay, todoList } from '../models/todoList';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private http = inject(HttpClient);
  todoClass = todoDisplay;
  url!: string;
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  }
  textHttpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'text/plain'
    })
  }

  todoDataRS = rxResource<any, any>({
    loader: () => this.http.get<todoList[]>('/Todo/GetTodoList')
      .pipe(
        map((response: any) => {
         const result = [];
          for (let v of response) {
            result.push(new this.todoClass(v));
          }
          return result;
        })
      )
  });
  deleteTodo(id: any): Observable<any> {
    return this.http.delete<any>('/Todo/DeleteTodo/' + id, this.httpOptions)
  }
  getById(id: any): Observable<any> {
    return this.http.get<any>('/Todo/GetById/' + id);
  }
  addTodo(record: any): Observable<any> {
    return this.http.post<any>( '/Todo/AddTodo', record, this.httpOptions)
  }
  updateTodo(record: any): Observable<any> {
    return this.http.put<any>('/Todo/UpdateTodo', record)
  }
}

