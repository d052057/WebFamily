import { Component, computed, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { VideoUtils } from '../shared/video-player/videoUtils/videoUtils';
import { VideoSource, AudioTrack, Chapter, VideoTrack } from '../shared/video-player/models/video.model';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-play-media',
  imports: [VideoPlayerComponent],
  templateUrl: './play-media.component.html',
  styleUrl: './play-media.component.scss'
})
export class PlayMediaComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  data!: VideoSource[];
  private destroy$ = new Subject<void>();
  medias!: any;
  menuFolder: string = '';
  menu: string = '';
  fileFolder: string = '';
  resource = this.mediaService.getMediaRecordRS;
  constructor() {
    effect( () => {
      const localData = this.resource.value(); // This will trigger on change
      if (localData) {
        const result: any = [];
        for (let v of localData) {
          let tmp = {
            title:  v.title,
            src: this.fileFolder + v.url,
            type: v.type,
            duration: v.duration,
            captions: v.captions,
            chapters: v.chapters,
            audioTracks: v.audioTracks
          }
          result.push(new VideoSource(tmp, v.id));

        }
        this.data = result;
      };
    });
  };
  ngOnInit(): void {
    this.medias = environment.mediaConfig.medias;
    this.activatedRoute.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (params: any) => {
          this.menuFolder = (params.get('folder'));
          this.menu = (this.activatedRoute.snapshot.url[0].path); // should return musics
          this.fileFolder = this.medias + '/' + this.menu + "/" + this.menuFolder + "/";
          this.mediaService.menu.set(this.menu);
          this.mediaService.folder.set(this.menuFolder);
        }
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
