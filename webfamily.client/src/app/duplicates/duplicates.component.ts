import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { NotifierService } from '../shared/notifier/notifier.service';
import { SearchBoxComponent } from '../shared/search-box/search-box.component';
import { SnackService } from '../shared/services/snack.service';
import {
  ContentMode,
  DuplicateGroup,
  DuplicatesPage,
  DuplicatesService,
  MediaFile,
} from '../shared/services/duplicates.service';

@Component({
  selector: 'app-duplicates',
  standalone: true,
  imports: [SearchBoxComponent],
  templateUrl: './duplicates.component.html',
  styleUrl: './duplicates.component.scss',
})
export class DuplicatesComponent implements OnDestroy {
  private readonly svc = inject(DuplicatesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(SnackService);       // quick confirmations (auto-dismiss)
  private readonly notifier = inject(NotifierService); // errors (stay until dismissed)

  /** Toggle buttons; keys match GroupCounts and the API `mode` parameter. */
  readonly modes: { key: ContentMode; label: string }[] = [
    { key: 'all', label: 'All same-size' },
    { key: 'same', label: 'Same size + same content' },
    { key: 'different', label: 'Same size, different content' },
    { key: 'pending', label: 'Hash pending' },
  ];

  readonly q = signal('');
  readonly mode = signal<ContentMode>('all');
  readonly page = signal(1);
  readonly data = signal<DuplicatesPage | null>(null);
  readonly counts = computed(() => this.data()?.counts ?? null);
  readonly loading = signal(false);
  readonly scanning = signal(false);
  readonly viewer = signal<{ name: string; url: SafeUrl } | null>(null);
  private viewerRaw: string | null = null;

  /** The shared search box emits on every keystroke, so debounce here before hitting the API. */
  private static readonly SEARCH_DEBOUNCE_MS = 400;
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(DuplicatesComponent.SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(v => {
        this.q.set(v.trim());
        this.page.set(1); // a new search starts at page 1
        this.load();
      });
    this.load();
  }

  /** Wired to (searchChange) of the app's shared <app-search-box>. */
  onSearch(value: string) {
    this.search$.next(value);
  }

  setMode(m: ContentMode) {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.page.set(1);
    this.load();
  }

  goto(p: number) {
    const total = this.data()?.totalPages ?? 1;
    if (p < 1 || p > total) return;
    this.page.set(p);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list(this.q(), this.page(), this.mode()).subscribe({
      next: d => {
        this.data.set(d);
        this.page.set(d.page);
        this.loading.set(false);
      },
      error: e => {
        this.fail(e, 'Failed to load duplicates.');
        this.loading.set(false);
      },
    });
  }

  rescan() {
    this.scanning.set(true);
    this.svc.scan().subscribe({
      next: r => {
        this.snack.openSnackBar(
          `Scan done: ${r.seen} files, ${r.added} new, ${r.missing} missing, ${r.hashed} hashed.`,
          'done',
        );
        this.scanning.set(false);
        this.load();
      },
      error: e => {
        this.fail(e, 'Scan failed.');
        this.scanning.set(false);
      },
    });
  }

  remove(f: MediaFile) {
    // Material dialog (same as the other maintenance screens) instead of window.confirm().
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Move to review folder',
        message: `Move "${f.fileName}" to the review folder? You can check it there before deleting it for good.`,
        confirmLabel: 'Move',
        destructive: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.svc.delete(f.id).subscribe({
        next: () => {
          this.snack.openSnackBar('File moved to the review folder.', 'done');
          this.load();
        },
        error: e => {
          this.fail(e, 'Delete failed.');
          this.load(); // the list may be stale (file already gone)
        },
      });
    });
  }

  view(f: MediaFile) {
    this.svc.photo(f.id).subscribe({
      next: blob => {
        this.closeViewer();
        this.viewerRaw = URL.createObjectURL(blob);
        this.viewer.set({ name: f.fileName, url: this.sanitizer.bypassSecurityTrustUrl(this.viewerRaw) });
      },
      error: () => this.fail(null, 'Could not load the photo.'),
    });
  }

  /** Errors use the app's NotifierService so they stay on screen until dismissed. */
  private fail(e: any, fallback: string) {
    this.notifier.showNotification(e?.error?.detail ?? fallback, 'Close', 'danger');
  }

  closeViewer() {
    if (this.viewerRaw) URL.revokeObjectURL(this.viewerRaw);
    this.viewerRaw = null;
    this.viewer.set(null);
  }

  /** 1-based index of this file's hash within its group, so identical files share a number. */
  hashNo(g: DuplicateGroup, f: MediaFile): number {
    if (!f.sha256) return 0;
    return [...new Set(g.files.map(x => x.sha256).filter(Boolean))].indexOf(f.sha256) + 1;
  }

  mb(bytes: number) {
    return (bytes / 1024 / 1024).toFixed(2);
  }

  ngOnDestroy() {
    this.closeViewer();
  }
}
