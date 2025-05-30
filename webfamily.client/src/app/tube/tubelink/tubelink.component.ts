import { Component, computed, inject, OnInit } from '@angular/core';
import { NgxPaginationModule, PaginationInstance } from 'ngx-pagination';
import { GridVideoComponent } from '../../shared/grid-video/grid-video.component';
import { CommonModule } from '@angular/common';
import { TubeService } from './../../tube/services/tube.service';
import { Webtube } from './../models/webtubes.model';
import { SafePipe } from '../../shared/pipes/safe.pipe';

@Component({
    selector: 'app-tubelink',
  imports: [CommonModule, SafePipe,NgxPaginationModule, GridVideoComponent],
    templateUrl: './tubelink.component.html',
    styleUrl: './tubelink.component.scss'
})
export class TubelinkComponent implements OnInit {
  /*==========*/
  autoHide: boolean = true;
  directionLinks: boolean = true;
  responsive: boolean = true;
  screenReaderPaginationLabel = "Pagination";
  nextLabel = "Next";
  previousLabel = "Previous";
  screenReaderPageLabel = "Page";
  screenReaderCurrentLabel = "You'r on page";
  /*==========*/
  processLoading: boolean = false;
  videoIndex: number = -1;
  currentVideo: string = '';
  videoSeries!: any;
  isPlaying: boolean = false;
  isShow: boolean = false;
  rowSelect: any = '';
  pageSize: number = 10;
  currentPage: number = 1;
  private service = inject(TubeService);
  public config: PaginationInstance = {
    id: "custom",
    itemsPerPage: this.pageSize,
    currentPage: this.currentPage
  };
  constructor(
  ) { };
  ngOnInit(): void {
  }
  dataSource = computed(() => this.service.tubeRecordsRS.value() as Webtube[]);
  selectedRow(row: any, index: number) {
    let r: number = index + 1
    let remainder: number = r % this.pageSize;
    let pageNbr: number = Math.floor(r / this.pageSize);
    if (remainder > 0) {
      pageNbr++;
    }
    this.config.currentPage = pageNbr;
    this.isPlaying = true;
    this.videoIndex = index;
    this.currentVideo = row.webTubeTitle;
    this.rowSelect = 'https://www.youtube.com/embed/' + row.videoId;
    this.videoSeries = row.webTubeSeries;
    this.isShow = false;
    if (row.videoListId !== '') {
      this.isShow = true;
    }
  }
  fromSeriesSelected(event: any) {
    this.rowSelect = 'https://www.youtube.com/embed/' + event.videoId;
    this.isShow = true;
    this.currentVideo = event.videoTitle;
  }
}
