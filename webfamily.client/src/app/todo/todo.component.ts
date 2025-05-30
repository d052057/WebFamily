import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TodoMaintComponent } from './todomaint/todomaint.component';
import { TodoService } from './services/todo.service';
import { MatTableModule } from '@angular/material/table'
import { SnackService } from '../shared/services/snack.service'
import { CommonModule } from '@angular/common';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../app/models/languages'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdkColumnDef } from '@angular/cdk/table';
import { VoiceDirective } from '../shared/directives/voice.directive';
import { SvgIconService } from "../shared/services/svg-icon.service"
@Component({
  selector: 'app-todo',
  imports: [CommonModule, VoiceDirective, MatIconModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatTableModule, MatFormFieldModule, MatPaginator, MatInputModule],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss'],
  providers: [CdkColumnDef],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoComponent {
  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  searchVal = signal('');
  initColumns: any[] = [
    {
      name: 'displayDueDate',
      display: 'Due Date'
    },
    {
      name: 'displayTime',
      display: 'Time'
    },
    {
      name: 'note',
      display: 'Note'
    },
    {
      name: 'assigned',
      display: 'Assigned To'
    },
    {
      name: 'action',
      display: 'action'
    }
  ];
  displayedColumns = this.initColumns.map(col => col.name);

  readonly paginator = viewChild.required(MatPaginator);
  readonly sort = viewChild.required(MatSort);
  private _dialog = inject(MatDialog);
  public service = inject(TodoService);
  private snackbar = inject(SnackService);
  svgIconService = inject(SvgIconService);
  resource = this.service.todoDataRS;
  filteredData = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData = (this.resource.value() || []);

    return allData ? allData.filter(
      (item: any) => {
        return (item.displayDueDate?.toLowerCase().includes(searchStr) ||
          item.displayTime?.toLowerCase().includes(searchStr) ||
          item.note?.toLowerCase().includes(searchStr) ||
          item.assigned?.toLowerCase().includes(searchStr)
        );
      }
    ) : [];
  });
  deleteTodo(id: number) {
    this.service.deleteTodo(id).subscribe({
      next: (res) => {
        this.snackbar.openSnackBar('Employee deleted!', 'done');
        this.service.todoDataRS.reload();
      },
      error: console.log,
    });
  }
  openAddNew() {
    const dialogRef = this._dialog.open(TodoMaintComponent, { width: '50%', height: '80%' });
    dialogRef.afterClosed().subscribe({
      next: (val: boolean) => {
        if (val) {
          this.service.todoDataRS.reload();
        }
      },
    });
  }
  openEdit(row: any) {
    let data = {
      recordId: row.recordId,
      dueDate: row.dueDate,
      note: row.note,
      assigned: row.assigned,
      dateTime: row.Date,
      displayDueDate: row.displayDueDate,
      displayTime: row.displayTime
    }
    const dialogRef = this._dialog.open(TodoMaintComponent, {
      data, width: '50%', height: '80%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val: boolean) => {
        if (val) {
          this.service.todoDataRS.reload();
        }
      },
    });
  }
  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }
  onSearch(searchStr: string): void {
    this.searchVal.set(searchStr);
  }
  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
    
  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.searchVal() + ' ' + transcript;
    this.searchVal.set(currentText.trim());
  }
}
