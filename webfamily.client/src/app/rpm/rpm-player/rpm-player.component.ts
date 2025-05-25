import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NgxPaginationModule } from 'ngx-pagination';

import { ActivatedRoute } from '@angular/router';
import { RpmService } from '../services/rpm.service';
import { BehaviorSubject, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

import { CommonModule } from '@angular/common';
import { NgxVideoPlayerComponent } from '../../shared/ngx-video-player/ngx-video-player.component';

@Component({
  selector: 'app-rpm-player',
  imports: [NgxVideoPlayerComponent, CommonModule, NgxPaginationModule],
  templateUrl: './rpm-player.component.html',
  styleUrl: './rpm-player.component.scss'
})
export class RpmPlayerComponent implements OnInit, OnDestroy {
  currentVideo$ = new BehaviorSubject(null);
  isPlaying: boolean = false;
  isLoading: boolean = true;
  rowSelect!: any;
  selectedRow(row: any, rowNbr: number) {
    this.videoIndex = rowNbr;
    this.rowSelect = row;
    this.currentVideo$.next(row.title);
  }
  get currentVideo(): any {
    let title = '';
    this.currentVideo$.subscribe(
      (val: any) => {
        title = val;
      });
    return this.rpmFolder + title;
  }
  autoplay: boolean = true;
  p: number = 1;
  private service = inject(RpmService);
  private activatedRoute = inject(ActivatedRoute)
  constructor() { }

  dataResult!: any;

  videoIndex: number = 0;
  rpmCoverFolder!: string;
  rpmFolder!: string;
  rpmRecordId!: string;
  mediaConfig = environment.mediaConfig;

  ngOnInit(): void {
    this.currentVideo$.subscribe();
    this.isLoading = true;
    this.activatedRoute.paramMap
      .subscribe(
        async (params: any) => {
          this.rpmCoverFolder = this.mediaConfig.AssetRpmCoverFolder + "/" + params.get('rpmfolder') + ".jpg";
          this.rpmFolder = this.mediaConfig.AssetRpmFolder + "/" + params.get('rpmfolder') + "/";
          this.rpmRecordId = await params.get('recordId');
          this.dataResult = [];
          this.service.getRpmTracks(this.rpmRecordId)
            .pipe(
              finalize(() => {
                this.videoIndex = 0;
                this.isPlaying = true;
                this.selectedRow(this.dataResult[this.videoIndex], this.videoIndex);
                this.isLoading = false;
              })
            )
            .subscribe(
              {
                next: (data: any) => {
                  let tmp: any = [];
                  for (let i = 0; i < data.length; i++) {
                    //Change the format of the data
                    tmp.push({
                      title: data[i].title,
                      duration: data[i].duration,
                    });
                    this.dataResult = tmp;
                  }
                }
              }
            )
        })
  };
  videoStateEvent(evnt: any) {
    if (evnt == 'ended') {
      if (this.videoIndex < this.dataResult.length - 1) {
        let rowNbr = this.videoIndex + 1;
        let row = this.dataResult[rowNbr];
        this.selectedRow(row, rowNbr);
      }
    }
    if (evnt == 'playing') {
      this.isPlaying = true;
    } else {
      this.isPlaying = false;
    }
  }
  ngOnDestroy() {
    this.currentVideo$.next(null);
    this.currentVideo$.complete();
  }
}
