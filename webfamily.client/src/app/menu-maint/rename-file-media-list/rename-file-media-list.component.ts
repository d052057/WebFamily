import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
import { MediaService } from '../../shared/services/media.service';

import { Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field'

import { RenameMediaComponent } from '../rename-media/rename-media.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { languages } from '../../../app/models/languages';
import { MatPaginator } from '@angular/material/paginator';
import { MenuServiceService } from '../../shared/services/menu-service.service';
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { SvgIconService } from '../../shared/services/svg-icon.service';

@Component({
  selector: 'app-rename-file-media-list',
  imports: [CommonModule, VoiceDirective, FormsModule, MatSelectModule, MatPaginator, MatInputModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, MatTableModule, MatInputModule],
  templateUrl: './rename-file-media-list.component.html',
  styleUrls: ['./rename-file-media-list.component.scss']
})
export class RenameFileMediaListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  private mediaService = inject(MediaService);
  private menuService = inject(MenuServiceService);
  private svgIconService = inject(SvgIconService);
  private toastr = inject(SnackService);
  private _dialog = inject(MatDialog);
  dataSource = new MatTableDataSource<any>();
  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  searchVal = signal('');
  private destroy$ = new Subject<void>();

  loading: boolean = false;
  mediaIsDeleting: boolean = false;

  mediaPath: string = '';
  menuItemSelectedIndex: number = -1;
  menuSelectedIndex: number = -1;
  onMenuSelected(): void {
    this.onLoadTitle();
  }
  initColumns: any[] = [
    {
      name: 'title',
      display: 'File Name'
    },
    {
      name: 'type',
      display: 'Mime Type'
    },
    {
      name: 'action',
      display: 'action'
    }
  ];
  displayedColumns = this.initColumns.map(col => col.name);

  menuData = this.menuService.menu;
  titleData!: any;
  resource = this.mediaService.getMediaRecordRS;

  ngOnInit(): void {
  };
  constructor() {
    effect(() => {
      const data = this.resource.value() || []; // Reactive data from rxResource

      this.dataSource = new MatTableDataSource(data);
      this.dataSource.paginator = this.paginator;
      const filterValue = this.searchVal(); // Get the current search value
      this.dataSource.filter = filterValue.trim().toLowerCase(); // Filter dynamically

      // Define the filter predicate for custom filtering logic
      this.dataSource.filterPredicate = (rowData: any, filter: string) => {
        return Object.values(rowData).some((value: any) =>
          value.title.toLowerCase().includes(filter)
        );
      };
    });

  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator; // Bind paginator once
  }

  openRename(row: any) {
    const dialogRef = this._dialog.open(RenameMediaComponent, {
      data: { recordId: row.recordId, title: row.title, type: row.type, mediaPath: this.mediaPath }, width: '50%', height: '50%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          //this.searchVal.setValue('');
          //this.onSelectedTitle();
        }
      },
    })
      ;
  }
  deleteMediaFile(row: any) {
    this.mediaService.deleteMedia(row.recordId)
      .subscribe((result: any) => {
        this.toastr.openSnackBar(result, 'Delete');
        //this.searchVal.setValue('');
        //this.onSelectedTitle();
      });
  }

  onSelectedTitle() {
    let selectedTitle = this.titleData()[this.menuItemSelectedIndex].directory;
    let selectedMenu = this.menuData()[this.menuSelectedIndex].menu;
    this.mediaPath = selectedMenu + "\\" + selectedTitle;
    this.mediaService.folder.set(selectedTitle);
    this.mediaService.menu.set(selectedMenu);
    this.mediaService.fileFolder.set(this.mediaPath);
  }
  onLoadTitle() {
    this.menuService.getDirectoryList(this.menuData()[this.menuSelectedIndex].recordId);
    this.titleData = this.menuService.directory;
  };

  onSearch(searchStr: string): void {
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
