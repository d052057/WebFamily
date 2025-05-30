import { Component, computed, effect, inject } from '@angular/core';
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
    request: () => ({}),
    loader: () => this.activatedRoute.paramMap.pipe(
      map(params => ({
        menuFolder: params.get('musics'),
        menuSubFolder: params.get('folder'),
        artist: params.get('artist'),
        fileDir: (`${this.medias}/${params.get('musics')}/${params.get('folder')}`)
      }))
    )
  });

  routeParams = computed<RouteParams | undefined>(() => {
    return this.routeParamsResource.value();
  });
  constructor() {
    effect(() => {
      const params = this.routeParams();
      if (params?.menuFolder && params?.fileDir && params?.menuSubFolder) {   
        this.mediaService.menu.set(params.menuFolder);
        this.mediaService.fileFolder.set(params.fileDir);
        this.mediaService.folder.set(params.menuSubFolder);
      }
    });
    effect(() => {
      const localData = this.audioListData(); // This will trigger on change

    });
  }
}
