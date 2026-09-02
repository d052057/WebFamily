import {
  Component, HostListener, Input, OnInit, signal, computed,
  ChangeDetectionStrategy, ElementRef, ViewChildren, QueryList, AfterViewInit, input, effect
} from '@angular/core';
import { SafePipe } from '../../shared/pipes/safe.pipe';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [SafePipe],
  templateUrl: './photo-gallery.html',
  styleUrl: './photo-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotoGallery implements AfterViewInit {
  // Component inputs transformed into modern Signals
  readonly images = input<any[]>([]);
  readonly fileFolder = input<string>('');
  readonly folderName = input<string>('');
  readonly isLoading = input<boolean>(false);

  // Component UI State tracking
  readonly showDownArrow = signal(true);
  readonly showModal = signal(false);
  readonly currentImageIndex = signal(0);
  readonly visibleImages = signal<Record<number, boolean>>({});

  // Query DOM elements natively through Angular template hooks
  @ViewChildren('galleryItem') galleryItems!: QueryList<ElementRef>;

  // Dynamically computed current active modal asset
  readonly currentPhoto = computed(() => this.images()[this.currentImageIndex()]);

  private observer!: IntersectionObserver;

  constructor() {
    // Automatically re-bind scroll animations the exact millisecond server data refreshes
    effect(() => {
      const currentImages = this.images();
      if (currentImages && currentImages.length > 0) {
        setTimeout(() => {
          if (this.galleryItems) {
            this.observeElements();
          }
        }, 50);
      }
    });
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    // 5% viewport threshold with a bottom margin so images animate right BEFORE entering view
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).dataset['index']);

          // Progressive staggered entry delay timing
          setTimeout(() => {
            this.visibleImages.update(prev => ({ ...prev, [index]: true }));
          }, index * 30);

          this.observer.unobserve(entry.target); // Stop tracking once visible
        }
      });

      this.checkArrowVisibility();
    }, { threshold: 0.05, rootMargin: '0px 0px 15% 0px' });

    // Handle template changes if images array grows dynamically
    this.galleryItems.changes.subscribe(() => this.observeElements());
    this.observeElements();
  }

  private observeElements() {
    if (!this.observer || !this.galleryItems) return;
    this.galleryItems.forEach((ref) => this.observer.observe(ref.nativeElement));
  }

  private checkArrowVisibility() {
    if (!this.galleryItems || this.galleryItems.length === 0) return;
    const itemsArray = this.galleryItems.toArray();
    const lastItemRect = itemsArray[itemsArray.length - 1].nativeElement.getBoundingClientRect();
    this.showDownArrow.set(lastItemRect.top > window.innerHeight * 1.2);
  }

  openModal(index: number) {
    this.currentImageIndex.set(index);
    this.showModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal.set(false);
    document.body.style.overflow = 'auto';
  }

  previousImage() {
    const total = this.images().length;
    this.currentImageIndex.update(idx => (idx > 0 ? idx - 1 : total - 1));
  }

  nextImage() {
    const total = this.images().length;
    this.currentImageIndex.update(idx => (idx < total - 1 ? idx + 1 : 0));
  }

  // Keyboard desktop accessibility navigation
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.showModal()) return;
    if (event.key === 'ArrowRight') this.nextImage();
    if (event.key === 'ArrowLeft') this.previousImage();
    if (event.key === 'Escape') this.closeModal();
  }
}
