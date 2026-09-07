import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { ScrollingGalleryComponent } from './scrolling-gallery/scrolling-gallery.component';
import { RpmCoverItem } from './interfaces/rpm.interface';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { RpmService } from './services/rpm.service';
import { AudioPlayerComponent} from '../shared/audio-player/audio-player.component';
@Component({
  selector: 'app-rpm',
  imports: [ScrollingGalleryComponent, AudioPlayerComponent],
  templateUrl: './rpm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './rpm.component.scss'
})
export class RpmComponent {
  private rpmService = inject(RpmService);
  private appSettings = inject(AppSettingsService);
  selectedPicture: RpmCoverItem | null = null;
  poster: any = '';
  onPictureSelected(picture: RpmCoverItem): void {
    this.selectedPicture = picture;
    this.poster = picture.coverUrl;
    this.rpmService.recordId.set(picture.recordId); // set the recordId in the service
    this.rpmService.rpmTrackUrl.set(this.appSettings.rpmFolder + '/' + picture.folder); // set the track URL
  }
  rpmResource = this.rpmService.getRpmMenuRS;
  rpmTrackResource = this.rpmService.getRpmTracksRS;
  
  constructor() { 
   /* this.rpmService.coverFolder.set(this.appSettings.rpmCoverFolder)*/
  }

  dataResource = computed(() => {
    const resource = this.rpmResource.value();    
    return resource ?? [];
  })
  dataResult = computed(() => {
    const resource = this.rpmTrackResource.value();
    return resource;
  })
}
