import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './audio-play-album.component.scss'
})
export class AudioPlayAlbumComponent {
  activatedRoute = inject(ActivatedRoute);
  mediaService = inject(MediaService);

  fileDir!: string;
  medias = environment.mediaConfig.medias;
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
