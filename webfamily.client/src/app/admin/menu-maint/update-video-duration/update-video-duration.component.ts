import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { VideoDuration } from './services/video-duration';
import { finalize } from 'rxjs';

import { ActivatedRoute } from '@angular/router';
import { TimeConversionPipe } from '../../../shared/pipes/time-conversion.pipe';
@Component({
    selector: 'app-update-video-duration',
    imports: [TimeConversionPipe],
    providers: [TimeConversionPipe],
    templateUrl: './update-video-duration.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './update-video-duration.component.scss'
})
export class UpdateVideoDurationComponent implements OnInit {
  private videoDurationService = inject(VideoDuration);
  processLoading = signal(true);
  dataSource = signal<any[]>([]);
  menuFolder = signal<string>('');
  private timeConversion = inject(TimeConversionPipe);
  private activatedRoute = inject(ActivatedRoute);
  ngOnInit(): void {
    this.activatedRoute.paramMap
      .subscribe(
        (params: any) => {
          this.dataSource.set([]);
          this.menuFolder.set(params.get('menu'));
          this.processLoading.set(true);
          this.videoDurationService.getMediaView(this.menuFolder())
            .pipe(finalize(() => {
              this.processLoading.set(false);
            }))
            .subscribe({
              next: async (data: any) => {
                // Wait for every item's duration lookup to actually finish
                // before rendering, instead of setting dataSource on every
                // loop iteration while the (unawaited) duration lookups are
                // still pending in the background.
                await Promise.all(data.map((tmp: any) => {
                  const p = tmp.assets + "/" + tmp.title;
                  // .indexOf(...) returns 0 (falsy!) when "audio" is found
                  // at the very start of the string, which is exactly where
                  // it sits in a real audio mime type like "audio/mpeg" -
                  // so this must be compared against -1, not used as a
                  // truthy check, or every audio file gets misrouted into
                  // getVideoDuration() instead of getAudioDuration().
                  return tmp.type.indexOf("audio") !== -1
                    ? this.getAudioDuration(p, tmp)
                    : this.getVideoDuration(p, tmp);
                }));
                this.dataSource.set(data);
              },
              error: (error: Error) => console.log(error.message),
              complete: () => console.log('Complete')
            });
        }
      );
  }
  getVideoDuration(src: string, obj: any): Promise<void> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        obj['duration'] = Math.floor(video.duration);
        resolve();
      });
      video.addEventListener('error', () => {
        // Leave duration unset rather than hang the whole batch forever
        // waiting on a file that can't be read.
        resolve();
      });
      video.src = src;
    });
  }
  getAudioDuration(src: string, obj: any): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        obj['duration'] = Math.floor(audio.duration);
        resolve();
      });
      audio.addEventListener('error', () => {
        resolve();
      });
      audio.src = src;
    });
  }
  updateDuration() {
    this.update();
  }
  update(): void {
    let source: any[] = this.dataSource();
    let dataSourceLen: number = source.length - 1;
    let i: number = 0;
    this.dataSource.set([]);
    for (i = dataSourceLen; i >= 0; i--) {
      let data: any = source.pop();
      data.duration = this.timeConversion.transform(data.duration);
      this.videoDurationService.updateDuration(data)
        .subscribe((x: any) => {
          if (x.duration == '00:00:00') {
            x.duration = '';
            this.dataSource.update(list => [...list, x]);
          }
        }
      );
    }
  }
}
