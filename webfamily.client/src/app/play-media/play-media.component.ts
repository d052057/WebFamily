import { Component, computed, inject } from '@angular/core';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { VideoSource } from '../shared/video-player/models/video.model';
import { ActivatedRoute } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgxSpinnerComponent } from 'ngx-spinner';
@Component({
  selector: 'app-play-media',
  imports: [VideoPlayerComponent, NgxSpinnerComponent],
  templateUrl: './play-media.component.html',
  styleUrl: './play-media.component.scss'
})
export class PlayMediaComponent {
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  readonly medias = environment.mediaConfig.medias;

  routeParamsResource = rxResource({
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const menuFolder = params.get('folder') || '';
        const menu = this.activatedRoute.snapshot.url[0]?.path || '';        
        const fileFolder = `${this.medias}/${menu}/${menuFolder}`  
        if (menuFolder && menu) {
          this.mediaService.menu.set(menu);
          this.mediaService.folder.set(menuFolder);
          this.mediaService.fileFolder.set(fileFolder);
        }
        return {
          menuFolder: menuFolder,
          menu: menu,
          fileFolder: fileFolder
        }
      }
      )
    )
  });
  // Computed property for processed video data
  videoSources = computed(() => {

    const mediaData = this.mediaService.getMediaRecordRS.value();
    if (!mediaData) return [];
    const result: VideoSource[] = [];

    for (let v of mediaData) {
      const tmp = {
        title: v.title,
        src: v.url,
        type: v.type,
        duration: v.duration,
        captions: v.captions,
        chapters: v.chapters,
        audioTracks: v.audioTracks
      };
      result.push(new VideoSource(tmp, v.id));
    }
    return result;
  });
}
