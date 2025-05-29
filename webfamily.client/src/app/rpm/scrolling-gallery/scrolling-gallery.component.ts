// scrolling-gallery.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ElementRef, ViewChild, AfterViewInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RpmCoverItem } from '../interfaces/rpm.interface'; // Adjust the import path as necessary

@Component({
  selector: 'app-scrolling-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrolling-gallery.component.html',
  styleUrl: './scrolling-gallery.component.scss'
})
export class ScrollingGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('galleryTrack', { static: true }) galleryTrack!: ElementRef;
  @ViewChild('galleryViewport', { static: true }) galleryViewport!: ElementRef;

  pictureData = input.required<RpmCoverItem[]>();

  @Output() pictureSelected = new EventEmitter<RpmCoverItem>();

  pictures: RpmCoverItem[] = [];
  currentPosition = 0;
  itemHeight = 140; // Height including margins
  visibleItems = 3;
  totalItems = 51;
  translateY = 0;

  private keyboardListener?: (event: KeyboardEvent) => void;
  private wheelListener?: (event: WheelEvent) => void;

  get maxPosition(): number {
    return Math.max(0, this.totalItems - this.visibleItems);
  }

  get startItem(): number {
    return this.currentPosition + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPosition + this.visibleItems, this.totalItems);
  }

  ngOnInit(): void {
    this.initializePictures();
  }

  ngAfterViewInit(): void {
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  private initializePictures(): void {
    console.log('Initializing pictures with data:', this.pictureData());
    // Use provided data or generate default pictures
    if (this.pictureData().length > 0) {
      this.pictures = this.pictureData();
      this.totalItems = this.pictureData().length;
    } else {
      // Generate default 51 pictures
      this.pictures = Array.from({ length: 51 }, (_, i) => ({
        id: i + 1,
        coverUrl: '',
        recordId: '',
        folder: `Picture ${i + 1}`
      }));
    }
  }

  private setupEventListeners(): void {
    // Keyboard navigation
    this.keyboardListener = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.scrollUp();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.scrollDown();
      }
    };
    document.addEventListener('keydown', this.keyboardListener);

    // Mouse wheel support
    this.wheelListener = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.scrollUp();
      } else {
        this.scrollDown();
      }
    };
    this.galleryTrack.nativeElement.addEventListener('wheel', this.wheelListener);
  }

  private removeEventListeners(): void {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    if (this.wheelListener) {
      this.galleryTrack.nativeElement.removeEventListener('wheel', this.wheelListener);
    }
  }

  scrollUp(): void {
    if (this.currentPosition > 0) {
      this.currentPosition--;
      this.updatePosition();
    }
  }

  scrollDown(): void {
    if (this.currentPosition < this.maxPosition) {
      this.currentPosition++;
      this.updatePosition();
    }
  }

  private updatePosition(): void {
    this.translateY = -this.currentPosition * this.itemHeight;
  }

  onPictureClick(picture: RpmCoverItem): void {
    // Emit the selected picture
    this.pictureSelected.emit(picture);

    // Add visual feedback
    const clickedElement = this.galleryTrack.nativeElement
      .querySelector(`[data-picture-id="${picture.id}"]`) as HTMLElement;

    if (clickedElement) {
      clickedElement.style.transform = 'translateX(-15px) scale(1.05)';

      setTimeout(() => {
        clickedElement.style.transform = '';
      }, 200);
    }
  }

  // Public method to programmatically scroll to a specific item
  scrollToItem(itemIndex: number): void {
    const targetPosition = Math.max(0, Math.min(itemIndex - 1, this.maxPosition));
    this.currentPosition = targetPosition;
    this.updatePosition();
  }

  // Public method to update pictures dynamically
  updatePictures(newPictures: RpmCoverItem[]): void {
    this.pictures = newPictures;
    this.totalItems = newPictures.length;
    this.currentPosition = 0;
    this.updatePosition();
  }
}
