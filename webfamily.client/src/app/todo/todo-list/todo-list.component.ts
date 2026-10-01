import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { TodoService } from '../services/todo.service';
import { SearchBoxComponent } from '../../shared/search-box/search-box.component';
@Component({
  selector: 'app-todo-list',
  imports: [SearchBoxComponent],
  templateUrl: './todo-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './todo-list.component.scss'
})
export class TodoListComponent implements OnInit {
 public service = inject(TodoService);
  ngOnInit(): void {
    this.service.todoDataRS.value();
  }
  todoRecords = computed(() => this.service.todoDataRS.value())

  // This page had no search at all before - added using the app's shared
  // search-box component (same mic/voice + language pattern used elsewhere),
  // filtering by note or assigned rather than duplicating a plain <input>.
  private searchVal = signal('');
  filteredRecords = computed(() => {
    const term = this.searchVal().trim().toLowerCase();
    const records = this.todoRecords() ?? [];
    if (!term) return records;
    return records.filter((r: any) =>
      (r.note ?? '').toLowerCase().includes(term) ||
      (r.assigned ?? '').toLowerCase().includes(term)
    );
  });

  onSearch(value: string): void {
    this.searchVal.set(value);
  }
}
