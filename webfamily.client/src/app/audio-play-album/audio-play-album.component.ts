import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { MediaService } from '../shared/services/media.service';
import { rxResource } from '@angular/core/rxjs-interop';

interface RouteParams {
  menuFolder: string | null;
  menuSubFolder: string | null;
  artist: string | null;
  fileDir: string;
}

@Component({
  selector: 'app-audio-play-album',
  imports: [AudioPlayerComponent],
  templateUrl: './audio-play-album.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './audio-play-album.component.scss'
})
export class AudioPlayAlbumComponent {
  activatedRoute = inject(ActivatedRoute);
  mediaService = inject(MediaService);

  fileDir!: string;
  private appSettings = inject(AppSettingsService);
  medias = this.appSettings.mediaBasePath;
  menuFolder!: string;
  menuSubFolder!: string;
  artist: string = '';

  audioList = this.mediaService.getMediaRecordRS;
  audioListData = computed(() => {
    return this.audioList.value() || [];

  });

  routeParamsResource = rxResource({
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const menuFolder = params.get('musics') || '';
        const menuSubFolder = params.get('folder') || '';
        const artist = params.get('artist') || '';
        const fileDir = `${this.medias}/${params.get('musics')}/${params.get('folder')}`;
        if (menuFolder && fileDir && menuSubFolder) {
          this.mediaService.menu.set(menuFolder);
          this.mediaService.fileFolder.set(fileDir);
          this.mediaService.folder.set(menuSubFolder);
        }
        return {
          menuFolder: menuFolder,
          menuSubFolder: menuFolder,
          artist: artist,
          fileDir: fileDir
        }
      })
    )
  });
  constructor() {

  }
}
