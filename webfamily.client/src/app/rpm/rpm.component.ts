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
  poster: any = '';
  onPictureSelected(picture: RpmCoverItem): void {
    this.selectedPicture = picture;
    this.poster = picture.coverUrl;
    this.rpmService.recordId.set(picture.recordId); // set the recordId in the service
    this.rpmService.rpmTrackUrl.set(this.mediaConfig.AssetRpmFolder + '/' + picture.folder); // set the track URL
  }
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private rpmService = inject(RpmService);
  rpmResource = this.rpmService.getRpmMenuRS;
  rpmTrackResource = this.rpmService.getRpmTracksRS;
  readonly mediaConfig = environment.mediaConfig;
  constructor() { 
    this.rpmService.coverFolder.set(this.mediaConfig.AssetRpmCoverFolder)
  }

  dataResource = computed(() => {
    const resource = this.rpmResource.value();    
    return resource;
  })
  dataResult = computed(() => {
    const resource = this.rpmTrackResource.value();
    return resource;
  })
}
