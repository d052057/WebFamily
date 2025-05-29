import { Component, HostListener, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { Subject, Subscription, finalize, first, map, takeUntil } from 'rxjs';
import { MediaService } from '../shared/services/media.service';
import { SafePipe } from '../shared/pipes/safe.pipe';
import { rxResource } from '@angular/core/rxjs-interop';
export interface Iphoto {
  fileFolder: string,
  photoFolder: string
}
@Component({
  selector: 'app-photo',
  imports: [NgIf, NgFor, SafePipe],
  templateUrl: './photo.component.html',
  styleUrl: './photo.component.scss',
})
export class PhotoComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private mediaService = inject(MediaService);
  readonly mediaConfig = environment.mediaConfig;

  showModal = false;
  currentImageIndex = 0;
  fileFolder!: any;

  val: any = {
    photoFolder: '',
    fileFolder: ''
  }
  photoParam!: ParamMap | any;
  menu: any;
  dataResource = this.mediaService.getMediaRecordRS;
  visibleImages: boolean[] = [];

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.checkVisibility();
  }
  
  routeParamsResource = rxResource({
    request: () => ({}),
    loader: () => this.activatedRoute.paramMap.pipe(
      map(params => 
        {
          this.val.photoFolder = params.get('folder'),
          this.val.fileFolder = this.mediaConfig.AssetPhotoFolder + "/" + params.get('folder') + "/",
          this.fileFolder = this.mediaConfig.AssetPhotoFolder + "/" + params.get('folder') + "/",
          this.menu = this.activatedRoute.snapshot.url[0].path; // should return photos
        }
      )
    )
  });
  constructor() {
    effect(() => {
      const params = this.routeParamsResource; // This will trigger on change
      if (params) {
        if (this.val.photoFolder && this.menu && this.fileFolder) {
          this.mediaService.folder.set(this.val.photoFolder);
          this.mediaService.menu.set(this.menu);
          this.mediaService.fileFolder.set(this.fileFolder);
        }
      }
    });
    effect(() => {
      const mediaList = this.dataResource; // This will trigger on change
      if (mediaList) {
        this.visibleImages = new Array(mediaList.value().length).fill(false);
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
      : this.dataResource.value().length - 1;
  }

  nextImage() {
    this.currentImageIndex = this.currentImageIndex < this.dataResource.value().length - 1
      ? this.currentImageIndex + 1
      : 0;
  }
}
