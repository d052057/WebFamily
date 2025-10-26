import { Component, HostListener, Input, OnInit, effect, signal } from '@angular/core';
import { SafePipe } from '../../shared/pipes/safe.pipe';

@Component({
  selector: 'app-photo-gallery',
  imports: [SafePipe],
  templateUrl: './photo-gallery.html',
  styleUrl: './photo-gallery.scss',
})
export class PhotoGallery implements OnInit {
  @Input() images: any[] = [];
  @Input() fileFolder: string = '';
  @Input() folderName: string = '';
  @Input() isLoading: boolean = false;

  showDownArrow = true;
  showModal = false;
  currentImageIndex = 0;
  visibleImages: boolean[] = [];

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.checkVisibility();
  }

  constructor() {
    // Watch for changes in images array to reset visibility
    effect(() => {
      if (this.images.length > 0) {
        this.visibleImages = new Array(this.images.length).fill(false);
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          this.checkVisibility();
        }, 50);
      }
    });
  }

  public ngOnInit(): void {
    setTimeout(() => {
      this.checkVisibility();
    }, 100);
  }

  checkVisibility() {
    const imageElements = document.querySelectorAll('.gallery-item');
    if (imageElements.length === 0) {
      // If elements aren't ready yet, try again
      setTimeout(() => this.checkVisibility(), 50);
      return;
    }

    imageElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // Make images visible if they're within 80% of viewport or already visible
      if (rect.top <= windowHeight * 0.8) {
        setTimeout(() => {
          this.visibleImages[index] = true;
        }, index * 100);
      }
    });

    // Check if we should show the down arrow
    if (imageElements.length > 0) {
      const lastImage = imageElements[imageElements.length - 1];
      const lastImageRect = lastImage.getBoundingClientRect();
      // Hide arrow when last image is close to being visible
      this.showDownArrow = lastImageRect.top > window.innerHeight * 1.2;
    }
  }

  openModal(index: number) {
    this.currentImageIndex = index;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal = false;
    document.body.style.overflow = 'auto';
  }

  previousImage() {
    this.currentImageIndex = this.currentImageIndex > 0
      ? this.currentImageIndex - 1
      : this.images.length - 1;
  }

  nextImage() {
    this.currentImageIndex = this.currentImageIndex < this.images.length - 1
      ? this.currentImageIndex + 1
      : 0;
  }
}
