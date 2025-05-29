import { Component, computed, inject, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { ScrollingGalleryComponent } from './scrolling-gallery/scrolling-gallery.component';
import { RpmCoverItem } from './interfaces/rpm.interface';
import { environment } from '../../environments/environment';
import { RpmService } from './services/rpm.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/internal/operators/map';
import { AudioItem } from './../shared/audio-player/models/audio.model';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
@Component({
  selector: 'app-rpm',
  imports: [ScrollingGalleryComponent, NgIf, AudioPlayerComponent],
  templateUrl: './rpm.component.html',
  styleUrl: './rpm.component.scss'
})
export class RpmComponent {
  selectedPicture: RpmCoverItem | null = null;
  dataResult: any;
  poster: any = '';
  onPictureSelected(picture: RpmCoverItem): void {
    this.selectedPicture = picture;
    this.poster = picture.coverUrl;
    this.getRpmRecord(picture.recordId);
  }
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private rpmService = inject(RpmService);
  rpmResource = this.rpmService.getRpmMenuRS;
  readonly mediaConfig = environment.mediaConfig;
  constructor() { 
    this.rpmService.coverFolder.set(this.mediaConfig.AssetRpmCoverFolder)
  }

  dataResource = computed(() => {
    const resource = this.rpmResource.value();    
    return resource;
  })

  getRpmRecord(rpmRecordId: string) {
    let result: AudioItem[] = [];
    this.rpmService.getRpmTracks(rpmRecordId)
      .subscribe(
        {
          next: (data: any) => {
            let id = 0; 
            for (let v of data) {
              const tmp = {
                id: id++,
                title: v.title,
                duration: v.duration,
                url: this.mediaConfig.AssetRpmFolder + '/' + this.selectedPicture?.folder + '/' + v.title,
                type: 'audio/wav',
              };
              result.push(tmp); 
            }
            this.dataResult = result           
          }
        }
      )
  }
}
