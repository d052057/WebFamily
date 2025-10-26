import { Component, computed, effect, inject } from '@angular/core';
import { VideoViewerComponent } from './video-viewer/video-viewer.component';
import { VideoSource } from './models/video.model';

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
  imports: [VideoViewerComponent],
  templateUrl: './video-view-frame.component.html',
  styleUrl: './video-view-frame.component.scss'
})
export class VideoViewFrameComponent {
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  selectedVideo: VideoSource | null = null;
  readonly medias = environment.mediaConfig.medias;

  routeParamsResource = rxResource({
    params: () => ({}),
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const menuFolder = params.get('folder');
        const menu = 'movies'; // Hardcoded for now, can be dynamic based on your routing logic'
        const fileFolder = `${this.medias}/${menu}/${menuFolder || ''}`;
        if (menuFolder && menu) {
          this.mediaService.menu.set(menu);
          this.mediaService.folder.set(menuFolder);
          this.mediaService.fileFolder.set(fileFolder);
        }
        return {
          menuFolder: menuFolder,
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

  constructor() {
  }
  selectVideo(video: VideoSource) {
    this.selectedVideo = video;
  }
}
