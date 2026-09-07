import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { MediaService } from '../shared/services/media.service';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-play-audio',
  imports: [AudioPlayerComponent],
  templateUrl: './play-audio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./play-audio.component.scss', 'playlist.scss']
})
export class PlayAudioComponent {
  activatedRoute = inject(ActivatedRoute);
  mediaService = inject(MediaService);

  fileDir!: string;
  private appSettings = inject(AppSettingsService);
  medias = this.appSettings.mediaBasePath;
  menuFolder!: string;
  menuSubFolder!: string;
  artist: string = '';

  resource = this.mediaService.rockDirectoryResource;

  filteredData = computed(() => {
    return this.resource.value() || [];
  });
  audioList = this.mediaService.getRockMediaRecordRS;
  audioListData = computed(() => {
    return this.audioList.value() || [];

  });
  routeParamsResource = rxResource({
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        return {
          menuFolder: params.get('musics'),
          menuSubFolder: params.get('folder'),
          artist: params.get('artist'),
          fileDir: (`${this.medias}/${params.get('musics')}/${params.get('folder')}`)
        }
      })
    )
  });
  constructor() {
  }

  playRock(folder: string) {
    let temp = folder.split("\\");
    let newFolder = temp.join("/");
    const fileDir = this.routeParamsResource.value()?.fileDir ?? '';
    this.mediaService.rockFolder.set(folder);
    this.mediaService.rockFileFolder.set(fileDir + "/" + newFolder);
  }
}
