import { Component, computed, effect, inject } from '@angular/core';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouteParams } from './interfaces/audio.interface'; 

@Component({
  selector: 'app-play-audio',
  imports: [AudioPlayerComponent],
  templateUrl: './play-audio.component.html',
  styleUrls: ['./play-audio.component.scss','playlist.scss']
})
export class PlayAudioComponent {
  activatedRoute = inject(ActivatedRoute);
  mediaService = inject(MediaService);

  fileDir!: string;
  medias = environment.mediaConfig.medias;
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
    request: () => ({}),
    loader: () => this.activatedRoute.paramMap.pipe(
      map(params => ({
        menuFolder: params.get('musics'),
        menuSubFolder: params.get('folder'),
        artist: params.get('artist'),
        fileDir: (`${this.medias}/${params.get('musics')}/${params.get('folder') }`)
      }))
    )
  });
 
  params = computed<RouteParams | undefined>(() => {
    return this.routeParamsResource.value();
  });
  constructor() {
    effect(() => {
        const p = this.routeParamsResource.value();
    });
    effect(() => {
      const p = this.resource.value() || [];
    });
    effect(() => {
      const localData = this.audioList.value(); // This will trigger on change
      
    });
  }
 
  playRock(folder: string) {
    let temp = folder.split("\\");
    let newFolder = temp.join("/");
    const fileDir = this.params()?.fileDir ?? '';
    this.mediaService.rockFolder.set(folder);
    this.mediaService.rockFileFolder.set(fileDir + "/" + newFolder);
  }
}
