import { Component, computed, effect, inject } from '@angular/core';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { VideoSource } from '../shared/video-player/models/video.model';
import { ActivatedRoute } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';

interface VideoRouteParams {
  menuFolder: string | null;
  menu: string | null;
  fileFolder: string;
}

@Component({
  selector: 'app-play-media',
  imports: [VideoPlayerComponent],
  templateUrl: './play-media.component.html',
  styleUrl: './play-media.component.scss'
})
export class PlayMediaComponent {
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);

  readonly medias = environment.mediaConfig.medias;

  routeParamsResource = rxResource({
    request: () => ({}),
    loader: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const folder = params.get('folder');
        const menu = this.activatedRoute.snapshot.url[0]?.path || '';
        const fileFolder = `${this.medias}/${menu}/${folder || ''}/`;
        return {
          menuFolder: folder,
          menu: menu,
          fileFolder: fileFolder
        } as VideoRouteParams;
      })
    )
  });

  // Single computed property returning RouteParams interface
  routeParams = computed<VideoRouteParams | undefined>(() => {  return this.routeParamsResource.value(); });

  // Computed property for processed video data
  videoSources = computed(() => {
    const params = this.routeParams();

    if (!params?.menuFolder || !params.menu) return [];

    const mediaData = this.mediaService.getMediaRecordRS.value();
    if (!mediaData) return [];

    const result: VideoSource[] = [];

    for (let v of mediaData) {
      const tmp = {
        title: v.title,
        src: params.fileFolder + v.url,
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

  constructor() {
    effect(() => {
      const params = this.routeParams();
      if (params?.menuFolder && params?.menu) {
        this.mediaService.menu.set(params.menu);
        this.mediaService.folder.set(params.menuFolder);
      }
    });

    effect(() => {
      const sources = this.videoSources();
    });
  }
}
