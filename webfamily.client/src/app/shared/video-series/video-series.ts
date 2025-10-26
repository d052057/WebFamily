import { JsonPipe } from '@angular/common';
import { Component, HostListener, Input, OnInit, effect, signal, input, output } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-video-series',
  imports: [],
  templateUrl: './video-series.html',
  styleUrl: './video-series.scss',
})
export class VideoSeries implements OnInit {
  videoList = input.required<any[]>();
  serieSelectedEvent = output<any>();
  /*outputFromObservable*/
  selectSeries(val: any) {
    this.serieSelectedEvent.emit(val);
  }
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
    effect(() => {
      if (this.videoList.length > 0) {
        this.visibleImages = new Array(this.videoList.length).fill(false);
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

  getImgUrl(record: any): Observable<string> {
    if (record.thumbNailMaxresUrl.length > 0) {
      return record.thumbNailMaxresUrl;
    }
    if (record.thumbNailHighUrl.length > 0) {
      return record.thumbNailHighUrl;
    }
    if (record.thumbNailMediumUrl.length > 0) {
      return record.thumbNailMediumUrl;
    }
    if (record.thumbNailStandardUrl.length > 0) {
      return record.thumbNailStandardUrl;
    }
    return record.thumbNailDefaultUrl;
  }
}
