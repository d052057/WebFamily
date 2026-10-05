import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SearchBoxComponent } from '../shared/search-box/search-box.component';
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
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly viewer = signal<{ name: string; url: SafeUrl } | null>(null);
  private viewerRaw: string | null = null;

  /** The shared search box emits on every keystroke, so debounce here before hitting the API. */
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
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
    this.error.set(null);
    this.svc.list(this.q(), this.page(), this.mode()).subscribe({
      next: d => {
        this.data.set(d);
        this.page.set(d.page);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.detail ?? 'Failed to load duplicates.');
        this.loading.set(false);
      },
    });
  }

  rescan() {
    this.scanning.set(true);
    this.message.set(null);
    this.error.set(null);
    this.svc.scan().subscribe({
      next: r => {
        this.message.set(`Scan done: ${r.seen} files, ${r.added} new, ${r.missing} missing, ${r.hashed} hashed.`);
        this.scanning.set(false);
        this.load();
      },
      error: e => {
        this.error.set(e?.error?.detail ?? 'Scan failed.');
        this.scanning.set(false);
      },
    });
  }

  remove(f: MediaFile) {
    if (!confirm(`Move "${f.fileName}" to the review folder?`)) return;
    this.message.set(null);
    this.error.set(null);
    this.svc.delete(f.id).subscribe({
      next: r => {
        this.message.set(`Moved to review folder: ${r.movedTo}`);
        this.load();
      },
      error: e => this.error.set(e?.error?.detail ?? 'Delete failed.'),
    });
  }

  view(f: MediaFile) {
    this.svc.photo(f.id).subscribe({
      next: blob => {
        this.closeViewer();
        this.viewerRaw = URL.createObjectURL(blob);
        this.viewer.set({ name: f.fileName, url: this.sanitizer.bypassSecurityTrustUrl(this.viewerRaw) });
      },
      error: () => this.error.set('Could not load the photo.'),
    });
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
