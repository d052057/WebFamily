import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, timer } from 'rxjs';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { NotifierService } from '../shared/notifier/notifier.service';
import { SearchBoxComponent } from '../shared/search-box/search-box.component';
import { SnackService } from '../shared/services/snack.service';
import {
  ContentMode,
  DuplicateGroup,
  DuplicatesPage,
  DuplicatesService,
  ScanStatus,
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
  /** Latest status of the background scan; null until the first status call returns. */
  readonly scan = signal<ScanStatus | null>(null);
  readonly scanning = computed(() => this.scan()?.running ?? false);
  readonly scanText = computed(() => {
    const s = this.scan();
    if (!s?.running) return '';
    if (s.phase === 'Hashing') return `Hashing ${s.hashDone.toLocaleString()} / ${s.hashTotal.toLocaleString()} files`;
    if (s.phase === 'Scanning files') return `Scanning... ${s.filesSeen.toLocaleString()} files found`;
    return 'Starting scan...';
  });
  private pollSub?: Subscription;
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
    this.resumeScanStatus();
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

  /** Starts the background scan, then polls its progress. The HTTP call returns at once. */
  rescan() {
    this.svc.startScan().subscribe({
      next: st => {
        this.scan.set(st);
        this.poll();
      },
      error: e => {
        if (e.status === 409 && e.error) {
          // a scan is already running (another tab/user): just follow it
          this.scan.set(e.error);
          this.poll();
        } else {
          this.fail(e, 'Could not start the scan.');
        }
      },
    });
  }

  cancelScan() {
    this.svc.cancelScan().subscribe({ error: e => this.fail(e, 'Could not cancel the scan.') });
  }

  /** On page load: if a scan is already running (e.g. after a browser refresh), keep showing progress. */
  private resumeScanStatus() {
    this.svc.scanStatus().subscribe({
      next: st => {
        this.scan.set(st);
        if (st.running) this.poll();
      },
      error: () => {
        /* status is optional on load; ignore */
      },
    });
  }

  private poll() {
    this.pollSub?.unsubscribe();
    this.pollSub = timer(0, 2000)
      .pipe(switchMap(() => this.svc.scanStatus()))
      .subscribe({
        next: st => {
          this.scan.set(st);
          if (st.running) return;

          this.pollSub?.unsubscribe();
          if (st.error) this.notifier.showNotification(st.error, 'Close', 'danger');
          else if (st.message) this.snack.openSnackBar(st.message, 'done');
          this.load(); // show the new results
        },
        error: e => {
          this.pollSub?.unsubscribe();
          this.fail(e, 'Lost contact with the scan status. Refresh the page to check on it.');
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
    this.pollSub?.unsubscribe(); // the scan itself keeps running on the server
    this.closeViewer();
  }
}
