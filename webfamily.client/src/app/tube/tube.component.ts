import { Component, OnDestroy, inject, signal, viewChild, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { TubeService } from './services/tube.service';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AddComponent } from './add/add.component';
import { SnackService } from '../shared/services/snack.service';
import { Webtube } from './models/webtubes.model'
import { first, Subject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../app/models/languages';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VoiceDirective } from '../../app/shared/directives/voice.directive';

@Component({
  selector: 'app-tube',
  imports: [MatFormFieldModule, MatIconModule, MatTableModule, ReactiveFormsModule, MatPaginator, MatSelectModule, MatInputModule, VoiceDirective, FormsModule],
  templateUrl: './tube.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tube.component.scss'
})
export class TubeComponent implements OnDestroy {
  private service = inject(TubeService);
  private _dialog = inject(MatDialog);
  private snackService = inject(SnackService);
  private destroy$ = new Subject<void>();

  voiceSubscription!: Subscription;
  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;

  searchVal = signal('');
  pageIndex = signal(0);
  pageSize = signal(5);
  total = signal(0);
  isDelete: boolean = false;

  initColumns: any[] = [
    { name: 'webTubeLink', display: 'Youtube Link' },
    { name: 'videoId', display: 'Video Id' },
    { name: 'title', display: 'Title' },
    { name: 'actions', display: 'actions' }
  ];

  // FIXED: Changed paginator to use signal-based viewChild (matches your sort syntax)
  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  displayedColumns = this.initColumns.map(col => col.name);
  resource = this.service.asyncTubeRecordsRS;

  // FIXED: Data source initialized once here, instead of inside a computed signal
  dataSource = new MatTableDataSource<Webtube>([]);

  constructor() {
    // FIXED: Keeps everything safely linked when navigating back and forth
    effect(() => {
      const allData = this.resource.value() || [];
      this.dataSource.data = allData;

      const p = this.paginator();
      if (p) {
        this.dataSource.paginator = p;
      }

      const s = this.sort();
      if (s) {
        this.dataSource.sort = s;
      }
    });

    // FIXED: Correct way to map search value directly into mat-table's core engine
    effect(() => {
      const searchStr = (this.searchVal() || '').toLowerCase();
      this.dataSource.filter = searchStr;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addNew(): void {
    const dialogRef = this._dialog.open(AddComponent, { width: '50%', height: '80%' });
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.service.asyncTubeRecordsRS.reload();
        }
      },
    });
  }

  startEdit(data: Webtube): void {
    const dialogRef = this._dialog.open(AddComponent, { data, width: '50%', height: '85%' });
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.service.asyncTubeRecordsRS.reload();
        }
      },
    });
  }

  deleteItem(row: Webtube): void {
    this.service.deleteWebtube(row.recordId)
      .pipe(first())
      .subscribe((result: any) => {
        this.snackService.openSnackBar(result.message);
        this.service.asyncTubeRecordsRS.reload();
      });
  }

  onSearch(searchStr: string) {
    this.searchVal.set(searchStr);
  }

  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }

  onVoiceInput(transcript: string | any) {
    let currentText = this.searchVal() + ' ' + transcript;
    this.searchVal.set(currentText.trim());
  }

  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }

  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }
}
