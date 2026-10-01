import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TodoMaintComponent } from './todomaint.component';
import { TodoService } from '../../todo/services/todo.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table'
import { SnackService } from '../../shared/services/snack.service'
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CdkColumnDef } from '@angular/cdk/table';
import { SearchBoxComponent } from '../../shared/search-box/search-box.component';
@Component({
  selector: 'app-todo',
  imports: [SearchBoxComponent, MatTableModule, MatPaginator],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss'],
  providers: [CdkColumnDef],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoComponent {
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

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);
  private _dialog = inject(MatDialog);
  public service = inject(TodoService);
  private snackbar = inject(SnackService);
  resource = this.service.todoDataRS;
  private dataSource = new MatTableDataSource<any>([]);
  filteredData = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData = (this.resource.value() || []);

    const filtered = allData ? allData.filter(
      (item: any) => {
        return (
          (item.displayDueDate ?? '').toLowerCase().includes(searchStr) ||
          (item.displayTime ?? '').toLowerCase().includes(searchStr) ||
          (item.note ?? '').toLowerCase().includes(searchStr) ||
          (item.assigned ?? '').toLowerCase().includes(searchStr)
        );
      }
    ) : [];

    this.dataSource.data = filtered;
    return this.dataSource;
  });
  constructor() {
    // Paginator/sort view children aren't available until after the view has
    // finished initializing. Wiring them here (instead of inside the
    // computed above) means filteredData() never has to read them, so the
    // very first render can't throw before they're ready.
    effect(() => {
      const paginator = this.paginator();
      const sort = this.sort();
      if (paginator) {
        this.dataSource.paginator = paginator;
      }
      if (sort) {
        this.dataSource.sort = sort;
      }
    });
  }
  deleteTodo(row: any) {
    // Todo previously had no confirmation step at all before deleting -
    // added one here for consistency with Links Maintenance, using the same
    // Material dialog rather than a native browser confirm().
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete todo',
        message: `Delete "${row.note || 'this item'}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.service.deleteTodo(row.recordId).subscribe({
        next: () => {
          this.snackbar.openSnackBar('Employee deleted!', 'done');
          this.service.todoDataRS.reload();
        },
        error: console.log,
      });
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
  onSearch(searchStr: string): void {
    this.searchVal.set(searchStr);
  }
}
