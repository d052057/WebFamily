// rpm-cover-carousel.component.ts
// Cover-flow style carousel of every CD cover (1..N). The centre cover is the album
// that is loaded in the player; browsing to another one (arrows, swipe, click a side
// cover, ←/→ keys) selects that album after a short pause.
import {
  Component, ChangeDetectionStrategy, AfterViewInit, ElementRef, HostListener, OnDestroy,
  computed, effect, input, output, signal, untracked, viewChild
} from '@angular/core';
import { RpmCoverItem } from '../interfaces/rpm.interface';

interface Slide {
  item: RpmCoverItem;
  offset: number; // 0 = centre, negative = left, positive = right
}

@Component({
  selector: 'app-rpm-cover-carousel',
  standalone: true,
  imports: [],
  templateUrl: './rpm-cover-carousel.component.html',
  styleUrl: './rpm-cover-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpmCoverCarouselComponent implements AfterViewInit, OnDestroy {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  covers = input.required<RpmCoverItem[]>();
  /** Id of the album currently loaded in the player. */
  selectedId = input<number | null>(null);
  /** Wait this long after the last move before selecting the album (ms). */
  settleDelay = input(500);

  /** Emitted once the user settles on a cover that differs from the loaded album. */
  coverSelected = output<RpmCoverItem>();

  readonly index = signal(0);
  readonly total = computed(() => this.covers().length);
  readonly current = computed(() => this.covers()[this.index()] ?? null);

  /** Only the covers within 3 positions of the centre are rendered (wraps around). */
  readonly slides = computed<Slide[]>(() => {
    const list = this.covers();
    const n = list.length;
    const idx = this.index();
    const out: Slide[] = [];
    for (let i = 0; i < n; i++) {
      let o = ((i - idx) % n + n) % n;
      if (o > n / 2) o -= n;
      if (Math.abs(o) <= 3) out.push({ item: list[i], offset: o });
    }
    return out;
  });

  /** True while the shown cover isn't the one loaded in the player yet. */
  readonly pending = computed(() => {
    const cur = this.current();
    return !!cur && cur.id !== this.selectedId();
  });

  /** Real width/height of each cover, filled in as images load, so covers keep their true rectangle. */
  readonly ratios = signal<Readonly<Record<number, number>>>({});
  private static readonly DEFAULT_RATIO = 1.4;

  ratioOf(id: number): number {
    return this.ratios()[id] ?? RpmCoverCarouselComponent.DEFAULT_RATIO;
  }

  onImageLoad(id: number, event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      const r = Math.round((img.naturalWidth / img.naturalHeight) * 1000) / 1000;
      if (this.ratios()[id] !== r) this.ratios.update(m => ({ ...m, [id]: r }));
    }
  }

  private settleTimer?: ReturnType<typeof setTimeout>;
  private dragStartX: number | null = null;
  private dragMoved = false;

  constructor() {
    // Follow the loaded album (e.g. when it was picked in the gallery list).
    effect(() => {
      const id = this.selectedId();
      const list = this.covers();
      if (id == null) return;
      const i = list.findIndex(c => c.id === id);
      if (i >= 0) untracked(() => this.index.set(i));
    });
  }

  ngAfterViewInit(): void {
    // Non-passive so the wheel can be used for browsing without scrolling the page.
    this.stage().nativeElement.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  ngOnDestroy(): void {
    clearTimeout(this.settleTimer);
    this.stage().nativeElement.removeEventListener('wheel', this.wheelHandler);
  }

  // ---------- mouse wheel / trackpad ----------

  private wheelAccum = 0;
  private wheelLock = false;
  private readonly wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    if (this.wheelLock) return;
    // Use whichever axis the user is mostly moving (trackpad sideways swipe or normal wheel).
    const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.wheelAccum += e.deltaMode === 1 ? raw * 33 : raw;
    if (Math.abs(this.wheelAccum) < 50) return;
    const dir = this.wheelAccum > 0 ? 1 : -1;
    this.wheelAccum = 0;
    this.wheelLock = true;
    setTimeout(() => (this.wheelLock = false), 260);
    this.moveBy(dir);
  };

  // ---------- jump to a CD number ----------

  jumpTo(value: string): void {
    const n = this.total();
    const num = Math.round(Number(value));
    if (!n || !Number.isFinite(num)) return;
    this.goTo(Math.min(n, Math.max(1, num)) - 1);
  }

  onJump(input: HTMLInputElement): void {
    this.jumpTo(input.value);
    input.value = String(this.index() + 1); // show the clamped / accepted number
  }

  /** ←/→ work anywhere on the page (unless you're typing or using a slider). */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    e.key === 'ArrowLeft' ? this.prev() : this.next();
  }

  abs(n: number): number { return Math.abs(n); }

  next(): void { this.moveBy(1); }
  prev(): void { this.moveBy(-1); }

  moveBy(delta: number): void {
    const n = this.total();
    if (!n) return;
    this.goTo(((this.index() + delta) % n + n) % n);
  }

  goTo(index: number): void {
    if (index === this.index()) return;
    this.index.set(index);
    this.scheduleSelect();
  }

  onSlideClick(slide: Slide, event: Event): void {
    if (this.dragMoved) { event.preventDefault(); return; } // it was a swipe, not a click
    if (slide.offset !== 0) this.goTo(this.covers().indexOf(slide.item));
  }

  private scheduleSelect(): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      const cur = this.current();
      if (cur && cur.id !== this.selectedId()) this.coverSelected.emit(cur);
    }, this.settleDelay());
  }

  // ---------- keyboard / swipe ----------

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':  event.preventDefault(); this.prev(); break;
      case 'ArrowRight': event.preventDefault(); this.next(); break;
      case 'Home':       event.preventDefault(); this.goTo(0); break;
      case 'End':        event.preventDefault(); this.goTo(this.total() - 1); break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        clearTimeout(this.settleTimer);           // select right away
        const cur = this.current();
        if (cur && cur.id !== this.selectedId()) this.coverSelected.emit(cur);
        break;
      }
    }
  }

  onPointerDown(e: PointerEvent): void {
    this.dragStartX = e.clientX;
    this.dragMoved = false;
  }

  onPointerMove(e: PointerEvent): void {
    if (this.dragStartX === null) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) > 40) {
      this.dragMoved = true;
      this.dragStartX = e.clientX; // allow several steps in one drag
      dx < 0 ? this.next() : this.prev();
    }
  }

  onPointerUp(): void {
    this.dragStartX = null;
    // keep dragMoved true until after the click event that follows pointerup
    setTimeout(() => (this.dragMoved = false), 0);
  }
}
