import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { mediaMetaDatum } from '../models/media-metadata.model';
import { BehaviorSubject, finalize, map, of, Subject, Subscription, takeUntil } from 'rxjs';
import { NgxPaginationModule, PaginationInstance } from 'ngx-pagination';
import { languages } from '../../app/models/languages';

import { NgxVideoPlayerComponent } from '../shared/ngx-video-player/ngx-video-player.component';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { rxResource } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';
import { VoiceDirective } from '../../app/shared/directives/voice.directive';
import { SvgIconService } from '../shared/services/svg-icon.service';

@Component({
  selector: 'app-media-player',
  imports: [
    CommonModule,
    VoiceDirective,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    NgxVideoPlayerComponent,
    NgxPaginationModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './media-player.component.html',
  styleUrl: './media-player.component.scss'
})

export class MediaPlayerComponent implements OnInit, OnDestroy {

  currentVideo$ = new BehaviorSubject(null);
  isPlaying = false;
  videoIndex: number = 0;
  public isUserSpeaking: boolean = false;
  rowSelect!: any;
  private svgIconService = inject(SvgIconService);
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  private destroy$ = new Subject<void>();
  medias!: any;
  private route = inject(ActivatedRoute);
  private service = inject(MediaService);

  searchVal = signal('');
  currentPage = signal(1);
  itemsPerPage = signal(10);
  constructor() { };

  fileFolder: string = '';

  autoplay = true;
  menuFolder: string = '';
  menu: string = '';
  ngOnInit(): void {
    this.medias = environment.mediaConfig.medias;
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (params: any) => {
          this.menuFolder = (params.get('folder'));
          this.menu = (this.route.snapshot.url[0].path); // should return musics
          this.fileFolder = this.medias + '/' + this.menu + "/" + this.menuFolder + "/";
          this.service.menu.set(this.menu);
          this.service.folder.set(this.menuFolder);
        }
    );
  }
  resource = this.service.getMediaRecordRS;
  filteredData = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData = this.resource.value() || [];
    return allData ? allData.filter((item: any) => {
      return item.title?.toLowerCase().includes(searchStr); // Return true or false based on condition
    }) : [];
  });
  selectedRow(row: any) {
    let remainder: number = row.id % this.itemsPerPage();
    let pageNbr: number = Math.floor(row.id / this.itemsPerPage());
    /*console.log("pageNbr", pageNbr);*/

    if (remainder > 0) {
      pageNbr++;
      this.currentPage.set(pageNbr);
    }
    this.videoIndex = (row.id - 1);
    /*console.log("videoIndex:", this.videoIndex);*/
    this.currentVideo$.next(row.title);
    this.rowSelect = row;
  }
  ngOnDestroy() {
    this.currentVideo$.next(null);
    this.currentVideo$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
  get currentVideo(): any {
    let title = '';
    this.currentVideo$.subscribe(
      (val: any) => {
        title = val;
      });
    return this.fileFolder + title;
  }
  //============================
  videoStateEvent(evnt: any) {
    if (evnt == 'ended') {
      if (this.videoIndex < this.filteredData().length - 1) {
        this.videoIndex += 1;
        let row = this.filteredData()[this.videoIndex];
        this.selectedRow(row);
      }
    }
    if (evnt == 'playing') {
      this.isPlaying = true;
    } else {
      this.isPlaying = false;
    }
  }
  onSearch(searchStr: string) {
    this.searchVal.set(searchStr);
    this.currentPage.set(1);
  }
  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }
  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.searchVal() + ' ' + transcript;
    this.searchVal.set(currentText.trim());
  }
}
