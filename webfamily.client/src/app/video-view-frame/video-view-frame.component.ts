import { Component, computed, effect, inject } from '@angular/core';
import { VideoViewerComponent } from './video-viewer/video-viewer.component';
import { VideoSource } from './models/video.model';
import { NgIf, NgFor } from '@angular/common';
import { MediaService } from '../shared/services/media.service';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { VideoRouteParams } from './interfaces/video.interface'; 

export interface videoInterface {
  url: string,
  title: string,
  duration: number
}
@Component({
  selector: 'app-video-view-frame',
  imports: [NgIf, NgFor, VideoViewerComponent],
  templateUrl: './video-view-frame.component.html',
  styleUrl: './video-view-frame.component.scss'
})
export class VideoViewFrameComponent {
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  selectedVideo: VideoSource | null = null;
  readonly medias = environment.mediaConfig.medias;

  routeParamsResource = rxResource({
    request: () => ({}),
    loader: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const folder = params.get('folder');
        /*const menu = this.activatedRoute.snapshot.url[0]?.path || '';*/
        const menu = 'movies'; // Hardcoded for now, can be dynamic based on your routing logic'
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
  routeParams = computed<VideoRouteParams | undefined>(() => { return this.routeParamsResource.value(); });

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
  selectVideo(video: VideoSource) {
    this.selectedVideo = video;
  }
}
