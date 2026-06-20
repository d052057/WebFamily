import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
import { MediaService } from '../../shared/services/media.service';
import { Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field'
import { RenameMediaComponent } from '../rename-media/rename-media.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { languages } from '../../../app/models/languages';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MenuService } from '../../shared/services/menu.service';
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { MatSortModule, MatSort } from '@angular/material/sort';
@Component({
  selector: 'app-rename-file-media-list',
  imports: [VoiceDirective, FormsModule, MatSelectModule, MatPaginatorModule, MatSortModule, MatInputModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, MatTableModule, MatInputModule],
  templateUrl: './rename-file-media-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./rename-file-media-list.component.scss']
})
export class RenameFileMediaListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  //@ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  private mediaService = inject(MediaService);
  private menuService = inject(MenuService);
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

  menuData = this.menuService.getAvailableMenus();
  titleData: any = [];
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
    this.dataSource.sort = this.sort;
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
    this.menuService.deleteFile(row.recordId)
      .subscribe({
        next: (response: any) => {
          this.toastr.openSnackBar(response.message, 'Delete');
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
//import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
//import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//import { Subject } from 'rxjs';
//import { MatTableDataSource, MatTableModule } from '@angular/material/table';
//import { MatDialog } from '@angular/material/dialog';
//import { MatFormFieldModule } from '@angular/material/form-field';
//import { MatIconModule } from '@angular/material/icon';
//import { MatSelectModule } from '@angular/material/select';
//import { MatInputModule } from '@angular/material/input';
//import { MatPaginatorModule } from '@angular/material/paginator';
//import { MatPaginator } from '@angular/material/paginator';
//import { MatSortModule, MatSort } from '@angular/material/sort';
//import { MenuService } from '../../shared/services/menu.service';
//import { MediaService } from '../../shared/services/media.service';
//import { SnackService } from '../../shared/services/snack.service';
//import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
//import { languages } from '../../../app/models/languages';

//@Component({
//  selector: 'app-rename-file-media-list',
//  standalone: true,
//  imports: [
//    VoiceDirective,
//    FormsModule,
//    ReactiveFormsModule,
//    MatTableModule,
//    MatSortModule,
//    MatPaginatorModule,
//    MatFormFieldModule,
//    MatInputModule,
//    MatIconModule,
//    MatSelectModule,
//  ],
//  template: `
//    <table mat-table [dataSource]="dataSource">
//      <ng-container matColumnDef="title">
//        <th mat-header-cell *matHeaderCellDef>Title</th>
//        <td mat-cell *matCellDef="let row">{{ row.title }}</td>
//      </ng-container>
//      <tr mat-header-row *matHeaderRowDef="['title']"></tr>
//      <tr mat-row *matRowDef="let row; columns: ['title'];"></tr>
//    </table>
//  `,
//  changeDetection: ChangeDetectionStrategy.OnPush,
//})
//export class RenameFileMediaListComponent implements OnInit, AfterViewInit, OnDestroy {
//  @ViewChild(MatSort) sort!: MatSort;
//  @ViewChild(MatPaginator) paginator!: MatPaginator;

//  private mediaService = inject(MediaService);
//  private menuService = inject(MenuService);
//  private toastr = inject(SnackService);
//  private _dialog = inject(MatDialog);

//  dataSource = new MatTableDataSource<any>();
//  searchVal = signal('');
//  private destroy$ = new Subject<void>();

//  ngOnInit() { }
//  ngAfterViewInit() {
//    this.dataSource.sort = this.sort;
//    this.dataSource.paginator = this.paginator;
//  }
//  ngOnDestroy() {
//    this.destroy$.next();
//    this.destroy$.complete();
//  }
//}
