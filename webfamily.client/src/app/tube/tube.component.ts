import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TubeService } from './services/tube.service';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { AddComponent } from './add/add.component';
import { SnackService } from '../shared/services/snack.service';
import { Webtube } from './models/webtubes.model'
import { first, Subject, Subscription, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../app/models/languages';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VoiceDirective } from '../../app/shared/directives/voice.directive';
import { SvgIconService } from '../shared/services/svg-icon.service';
@Component({
  selector: 'app-tube',
  imports: [CommonModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    ReactiveFormsModule,
    MatPaginator,
    MatSelectModule,
    MatInputModule,
    VoiceDirective,
    FormsModule],
  templateUrl: './tube.component.html',
  styleUrl: './tube.component.scss'
})
export class TubeComponent implements OnInit, OnDestroy, AfterViewInit {
  private service = inject(TubeService);
  private _dialog = inject(MatDialog);
  private snackService = inject(SnackService);
  private svgIconService = inject(SvgIconService);
  private destroy$ = new Subject<void>();
  voiceSubscription!: Subscription;
  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  searchVal = signal('');


  isDelete: boolean = false;
  initColumns: any[] = [
    {
      name: 'webTubeLink',
      display: 'Youtube Link'
    },
    {
      name: 'videoId',
      display: 'Video Id'
    },
    {
      name: 'title',
      display: 'Title'
    },
    {
      name: 'actions',
      display: 'actions'
    }
  ];
  readonly sort = viewChild.required(MatSort);
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  displayedColumns = this.initColumns.map(col => col.name);
  ngOnInit(): void {

  }
  ngAfterViewInit() {
    // Connect paginator to dataSource
    /* this.tubeRecords().paginator = this.paginator;*/
  }

  resource = this.service.asyncTubeRecordsRS
  tubeRecords = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData = (this.resource.value() || []);
    const data = new MatTableDataSource(allData)
    data.paginator = this.paginator
    data.filter = searchStr;
    return data;
  });


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addNew(): void {
    const dialogRef = this._dialog.open(AddComponent, { width: '50%', height: '80%' });
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.service.tubeRecordsRS.reload();
        }
      },
    });
  }
  startEdit(data: Webtube): void {
    const dialogRef = this._dialog.open(AddComponent, {
      data, width: '50%', height: '85%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.service.tubeRecordsRS.reload();
        }
      },
    });
  }
  deleteItem(row: Webtube): void {

    this.service.deleteWebtube(row.recordId)
      .pipe(first())
      .subscribe((result: any) => {
        this.snackService.openSnackBar(result.message);
        this.service.tubeRecordsRS.reload();
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
}

