import { Component, inject, OnInit } from '@angular/core';
import { MediaService } from '../../shared/services/media.service';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TimeConversionPipe } from '../../shared/pipes/time-conversion.pipe';
import { DataSource } from '@angular/cdk/collections';
@Component({
    selector: 'app-update-video-duration',
    imports: [CommonModule, TimeConversionPipe],
    providers: [TimeConversionPipe],
    templateUrl: './update-video-duration.component.html',
    styleUrl: './update-video-duration.component.scss'
})
export class UpdateVideoDurationComponent implements OnInit {
  private service = inject(MediaService);
  processLoading: boolean = true;
  dataSource: any[] = [];
  menuFolder!: string;
  private timeConversion = inject(TimeConversionPipe);
  private activatedRoute = inject(ActivatedRoute);
  ngOnInit(): void {
    this.activatedRoute.paramMap
      .subscribe(
        (params: any) => {
          this.dataSource = [];
          this.menuFolder = params.get('menu');
          this.service.getMediaView(this.menuFolder)
            .pipe(finalize(() => {
              this.processLoading = false;
            }))
            .subscribe(
              async (data: any) => {
                for (var i = 0; i < data.length; i++) {
                  let tmp = data[i];
                  let p = tmp.assets + "/" + tmp.title;
                  if (tmp.type.indexOf("audio")) {
                    this.getAudioDuration(p, tmp)
                  } else {
                    this.getVideoDuration(p, tmp)
                  }
                  data[i] = tmp;
                  this.dataSource = data;
                }
              }
            ),
            (error: Error) => console.log(error.message),
            () => console.log('Complete')
        }
      );
  }
  getVideoDuration(src: string, obj: any) {
    return new Promise(function (resolve) {
      var video = document.createElement('video');
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        var event = new CustomEvent("myVideoDurationEvent", {
          detail: {
            duration: video.duration,
          }
        });
        obj['duration'] = Math.floor(video.duration);
      })
      video.src = src;
    }
    );
  }
  getAudioDuration(src: string, obj: any) {
    return new Promise(function (resolve) {
      var audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        var event = new CustomEvent("myAudioDurationEvent", {
          detail: {
            duration: audio.duration,
          }
        });
        obj['duration'] = Math.floor(audio.duration);
        /*obj.dispatchEvent(event);*/
      })
      audio.src = src;
    }
    );
  }
  updateDuration() {
    this.update();
  }
  update(): void {
    let dataSourceLen: number = this.dataSource.length - 1;
    let i: number = 0;
    let source: any[] = this.dataSource;
    this.dataSource = [];
    for (i = dataSourceLen; i >= 0; i--) {
      let data: any = source.pop();
      data.duration = this.timeConversion.transform(data.duration);
      this.service.updateDuration(data)
        .subscribe((x: any) => {
          if (x.duration == '00:00:00') {
            x.duration = '';
            this.dataSource.push(x);
          }
        }
      );
    }
  }
}
