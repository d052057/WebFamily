// scrolling-gallery.component.ts
import {
  Component, ElementRef, ChangeDetectionStrategy, AfterViewInit, OnDestroy,
  computed, effect, input, output, signal, viewChild
} from '@angular/core';
import { RpmCoverItem } from '../interfaces/rpm.interface';

@Component({
  selector: 'app-scrolling-gallery',
  standalone: true,
  imports: [],
  templateUrl: './scrolling-gallery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './scrolling-gallery.component.scss'
})
export class ScrollingGalleryComponent implements AfterViewInit, OnDestroy {
  readonly viewport = viewChild.required<ElementRef<HTMLElement>>('galleryViewport');

  pictureData = input.required<RpmCoverItem[]>();
  /** Id of the currently selected album (highlighted). */
  selectedId = input<number | null>(null);
  /** How many pictures fit on one page. */
  visibleCount = input(5);

  pictureSelected = output<RpmCoverItem>();

  private readonly localSelectedId = signal<number | null>(null);
  readonly activeId = computed(() => this.selectedId() ?? this.localSelectedId());

  readonly pictures = computed(() => this.pictureData());
  readonly totalItems = computed(() => this.pictures().length);
  readonly maxIndex = computed(() => Math.max(0, this.totalItems() - this.visibleCount()));

  /** Index (0-based) of the first fully visible item. */
  readonly firstIndex = signal(0);
  readonly firstVisible = computed(() => this.firstIndex() + 1);
  readonly lastVisible = computed(() => Math.min(this.firstIndex() + this.visibleCount(), this.totalItems()));
  readonly canScrollUp = computed(() => this.firstIndex() > 0);
  readonly canScrollDown = computed(() => this.firstIndex() < this.maxIndex());
  readonly progress = computed(() => this.maxIndex() > 0 ? this.firstIndex() / this.maxIndex() : 0);

  readonly loaded = signal<ReadonlySet<number>>(new Set());

  /** Where the animation is heading; lets rapid clicks/wheel ticks chain smoothly. */
  private targetIndex = 0;
  private animFrame = 0;
  private animating = false;
  private snapTimer?: ReturnType<typeof setTimeout>;
  private wheelAccum = 0;
  private wheelLock = false;
  private readonly mobileQuery = window.matchMedia('(max-width: 768px)');
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  private readonly wheelHandler = (e: WheelEvent) => this.onWheel(e);

  constructor() {
    effect(() => {
      this.pictures();
      queueMicrotask(() => this.syncFromScroll());
    });

    // When the selection changes from outside (e.g. the cover carousel in the player),
    // bring that album into the visible page.
    effect(() => {
      const id = this.selectedId();
      const list = this.pictures();
      if (id == null) return;
      const i = list.findIndex(p => p.id === id);
      if (i >= 0) queueMicrotask(() => this.revealIndex(i));
    });
  }

  /** Make sure item `index` is on the current page; centre it if it isn't. */
  private revealIndex(index: number): void {
    const first = this.firstIndex();
    const vis = this.visibleCount();
    if (index >= first && index <= first + vis - 1) return;
    this.goToIndex(index - Math.floor(vis / 2));
  }

  ngAfterViewInit(): void {
    // Must be non-passive so we can stop the page from scrolling too.
    this.viewport().nativeElement.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  ngOnDestroy(): void {
    this.viewport().nativeElement.removeEventListener('wheel', this.wheelHandler);
    cancelAnimationFrame(this.animFrame);
    clearTimeout(this.snapTimer);
  }

  onImageLoad(id: number): void {
    this.loaded.update(s => new Set(s).add(id));
  }

  // ---------- geometry helpers (work for vertical desktop + horizontal mobile) ----------

  private get horizontal(): boolean { return this.mobileQuery.matches; }

  private get pos(): number {
    const el = this.viewport().nativeElement;
    return this.horizontal ? el.scrollLeft : el.scrollTop;
  }

  private set pos(v: number) {
    const el = this.viewport().nativeElement;
    if (this.horizontal) el.scrollLeft = v; else el.scrollTop = v;
  }

  /** Distance between the start of one item and the next. */
  private get step(): number {
    const items = this.viewport().nativeElement.querySelectorAll<HTMLElement>('.picture-item');
    if (items.length < 2) return 0;
    return this.horizontal
      ? items[1].offsetLeft - items[0].offsetLeft
      : items[1].offsetTop - items[0].offsetTop;
  }

  private syncFromScroll(): void {
    const step = this.step;
    if (!step) { this.firstIndex.set(0); return; }
    const idx = Math.round(this.pos / step);
    this.firstIndex.set(Math.max(0, Math.min(this.maxIndex(), idx)));
  }

  // ---------- animation ----------

  /** Smoothly scroll so that item `index` is the first one on the page. */
  goToIndex(index: number, duration = 420): void {
    const step = this.step;
    if (!step) return;
    this.targetIndex = Math.max(0, Math.min(this.maxIndex(), index));
    const from = this.pos;
    const to = this.targetIndex * step;
    const delta = to - from;
    cancelAnimationFrame(this.animFrame);
    if (Math.abs(delta) < 1) { this.animating = false; return; }

    if (this.reduceMotion.matches) {
      this.pos = to; this.syncFromScroll(); return;
    }

    this.animating = true;
    const t0 = performance.now();
    // Longer jumps take a little longer, capped so it never feels sluggish.
    const dur = Math.min(700, duration + Math.abs(this.targetIndex - this.firstIndex()) * 25);
    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // easeOutQuart

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      this.pos = from + delta * ease(p);
      this.syncFromScroll();
      if (p < 1) {
        this.animFrame = requestAnimationFrame(tick);
      } else {
        this.animating = false;
      }
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  /** Native scroll (touch / drag): update the indicator, then settle on the nearest item. */
  onScroll(): void {
    this.syncFromScroll();
    if (this.animating || this.horizontal) return; // mobile uses plain native swipe
    clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(() => {
      const step = this.step;
      if (step) this.goToIndex(Math.round(this.pos / step), 220);
    }, 120);
  }

  private onWheel(e: WheelEvent): void {
    if (this.horizontal) return; // let touch/trackpad scroll natively on mobile
    e.preventDefault();
    if (this.wheelLock) return;

    // Trackpads fire many small deltas; accumulate until it's a real "tick".
    this.wheelAccum += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    if (Math.abs(this.wheelAccum) < 40) return;

    const dir = this.wheelAccum > 0 ? 1 : -1;
    this.wheelAccum = 0;
    this.wheelLock = true;
    setTimeout(() => (this.wheelLock = false), 140);
    this.goToIndex(this.targetIndex + dir, 360);
  }

  /** Button click: move one picture at a time. */
  scrollStep(direction: 1 | -1): void {
    const base = this.animating ? this.targetIndex : this.firstIndex();
    this.goToIndex(base + direction);
  }

  /** Page up/down: move a whole page (5 pictures). */
  scrollPage(direction: 1 | -1): void {
    this.goToIndex((this.animating ? this.targetIndex : this.firstIndex()) + direction * this.visibleCount(), 520);
  }

  scrollToItem(index: number): void {
    this.goToIndex(index);
  }

  // ---------- selection / keyboard ----------

  select(picture: RpmCoverItem): void {
    this.localSelectedId.set(picture.id);
    this.pictureSelected.emit(picture);
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.pictures();
    if (!list.length) return;
    const focused = Array.from(this.viewport().nativeElement.querySelectorAll('.picture-item'))
      .indexOf(document.activeElement as Element);
    const current = focused >= 0 ? focused : list.findIndex(p => p.id === this.activeId());

    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = Math.min(list.length - 1, current + 1); break;
      case 'ArrowUp':   next = Math.max(0, current < 0 ? 0 : current - 1); break;
      case 'Home':      next = 0; break;
      case 'End':       next = list.length - 1; break;
      case 'PageDown':  event.preventDefault(); this.scrollPage(1); return;
      case 'PageUp':    event.preventDefault(); this.scrollPage(-1); return;
      default: return;
    }
    event.preventDefault();

    const first = this.firstIndex();
    const vis = this.visibleCount();
    if (next < first) this.goToIndex(next);
    else if (next > first + vis - 1) this.goToIndex(next - vis + 1);

    const items = this.viewport().nativeElement.querySelectorAll<HTMLElement>('.picture-item');
    items[next]?.focus({ preventScroll: true });
  }
}
