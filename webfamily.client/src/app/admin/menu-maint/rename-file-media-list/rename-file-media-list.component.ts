import { AfterViewInit, Component, OnDestroy, OnInit, viewChild, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SnackService } from '../../../shared/services/snack.service';
import { MediaService } from '../../../shared/services/media.service';
import { Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field'
import { RenameMediaComponent } from '../rename-media/rename-media.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { languages } from '../../../models/languages';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MenuService } from '../../../shared/services/menu.service';
import { VoiceDirective } from '../../../shared/directives/voice.directive';
import { MatSortModule, MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-rename-file-media-list',
  imports: [VoiceDirective, FormsModule, MatSelectModule, MatPaginatorModule, MatSortModule, MatInputModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, MatTableModule],
  templateUrl: './rename-file-media-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./rename-file-media-list.component.scss']
})
export class RenameFileMediaListComponent implements OnInit, OnDestroy {
  // 1. FIXED: Convert to modern signal-based viewChild references
  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  private mediaService = inject(MediaService);
  private menuService = inject(MenuService);
  private toastr = inject(SnackService);
  private _dialog = inject(MatDialog);

  // 2. FIXED: Initialize the instance ONCE globally
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

  initColumns: any[] = [
    { name: 'title', display: 'File Name' },
    { name: 'type', display: 'Mime Type' },
    { name: 'action', display: 'action' }
  ];
  displayedColumns = this.initColumns.map(col => col.name);
  menuData = this.menuService.getAvailableMenus();
  titleData: any = [];
  resource = this.mediaService.getMediaRecordRS;

  ngOnInit(): void {
    // Custom filter logic defined once
    this.dataSource.filterPredicate = (rowData: any, filter: string) => {
      return (rowData.title?.toLowerCase().includes(filter) ?? false) ||
        (rowData.type?.toLowerCase().includes(filter) ?? false);
    };
  };

  constructor() {
    // 3. FIXED: Keep properties reactive without rebuilding the complete object instance
    effect(() => {
      const data = this.resource.value() || [];
      this.dataSource.data = data;

      const p = this.paginator();
      if (p) this.dataSource.paginator = p;

      const s = this.sort();
      if (s) this.dataSource.sort = s;
    });

    effect(() => {
      const filterValue = this.searchVal();
      this.dataSource.filter = filterValue.trim().toLowerCase();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuSelected(): void {
    this.onLoadTitle();
  }

  openRename(row: any) {
    const dialogRef = this._dialog.open(RenameMediaComponent, {
      data: { recordId: row.recordId, title: row.title, type: row.type, mediaPath: this.mediaPath },
      width: '50%',
      height: '50%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          // 4. FIXED: Refresh data source by forcing rxResource to reload backend records
          this.resource.reload();
        }
      },
    });
  }

  deleteMediaFile(row: any) {
    this.menuService.deleteFile(row.recordId)
      .subscribe({
        next: (response: any) => {
          this.toastr.openSnackBar(response.message, 'Delete');
          // 5. FIXED: Trigger reload here as well so deleted items vanish instantly
          this.resource.reload();
        },
        error: (err) => {
          this.toastr.openSnackBar(JSON.stringify(err.error), "Delete");
        }
      });
  }

  onSelectedTitle() {
    const selectedTitle = this.titleData[this.menuItemSelectedIndex].param;
    const selectedMenu = this.menuData[this.menuSelectedIndex];
    this.mediaPath = selectedMenu + "\\" + selectedTitle;
    this.mediaService.folder.set(selectedTitle);
    this.mediaService.menu.set(selectedMenu);
    this.mediaService.fileFolder.set(this.mediaPath);
  }

  onLoadTitle() {
    const selectedMenu = this.menuData[this.menuSelectedIndex];
    this.titleData = this.menuService.getMenuItems(selectedMenu);
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
