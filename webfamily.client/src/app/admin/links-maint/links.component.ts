import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LinksMaintComponent } from './linksmaint.component';
import { LinksService, linksErrorText } from './links.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { SnackService } from '../../shared/services/snack.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../models/languages';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdkColumnDef } from '@angular/cdk/table';
import { VoiceDirective } from '../../shared/directives/voice.directive';
import { MenuItem } from '../../models/menu-item.model';

// Duplicate of the Todo maintenance screen, backed by Data/links.json (via
// LinksController) instead of the Todo SQL table.
@Component({
  selector: 'app-links',
  imports: [VoiceDirective, MatIconModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatTableModule, MatSortModule, MatFormFieldModule, MatPaginator, MatInputModule],
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.scss'],
  providers: [CdkColumnDef],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinksComponent {
  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  searchVal = signal('');
  displayedColumns = ['title', 'param', 'action'];

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);
  private _dialog = inject(MatDialog);
  public service = inject(LinksService);
  private snackbar = inject(SnackService);
  resource = this.service.linksDataRS;
  private dataSource = new MatTableDataSource<MenuItem>([]);
  filteredData = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData: MenuItem[] = this.resource.value() || [];

    this.dataSource.data = allData.filter(item =>
      (item.title ?? '').toLowerCase().includes(searchStr) ||
      (item.param ?? '').toLowerCase().includes(searchStr)
    );
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
  deleteLink(row: MenuItem) {
    // Replaces window.confirm() with a Material dialog matching the rest of
    // the app's UI, instead of a native browser popup.
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete link',
        message: `Delete the link "${row.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.service.deleteLink(row.id).subscribe({
        next: () => {
          this.snackbar.openSnackBar('Link deleted!', 'done');
          this.service.linksDataRS.reload();
        },
        error: (err) => {
          this.snackbar.openSnackBar(linksErrorText(err), 'Error');
          // A stale id (list changed underneath us) is the likely cause of a
          // 404 - refresh so the next attempt uses current ids.
          this.service.linksDataRS.reload();
        },
      });
    });
  }
  openAddNew() {
    const dialogRef = this._dialog.open(LinksMaintComponent, { width: '50%', height: '60%' });
    dialogRef.afterClosed().subscribe({
      next: (val: boolean) => {
        if (val) {
          this.service.linksDataRS.reload();
        }
      },
    });
  }
  openEdit(row: MenuItem) {
    const data = { id: row.id, title: row.title, param: row.param };
    const dialogRef = this._dialog.open(LinksMaintComponent, {
      data, width: '50%', height: '60%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val: boolean) => {
        if (val) {
          this.service.linksDataRS.reload();
        }
      },
    });
  }
  onLangSelectChange() {
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
