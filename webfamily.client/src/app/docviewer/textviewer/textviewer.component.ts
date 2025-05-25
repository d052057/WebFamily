import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { MediaService } from '../../shared/services/media.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgClass, NgFor } from '@angular/common';
@Component({
  selector: 'app-textviewer',
  imports: [NgxPaginationModule, NgClass, NgFor],
  templateUrl: './textviewer.component.html',
  styleUrl: './textviewer.component.scss'
})
export class TextviewerComponent {
  textContent: string = '';
  processLoading: boolean = false;
  medias!: any;
  p: number = 1;
  private service = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  constructor(
  ) { };
  rowSelected!: any;
  fileFolder: any = '';
  docFolder: any = '';
  menu: any;
  //
  ngOnInit(): void {
    this.medias = environment.mediaConfig.medias;
    this.activatedRoute.paramMap
      .subscribe(
        async (params: any) => {
          this.docFolder = await params.get('folder');
          this.menu = await params.get('menu');
          //this.menu = this.activatedRoute.snapshot.url[0].path; // should return books
          this.fileFolder = await this.medias + '/' + this.menu + "/" + this.docFolder + "/";
          this.service.folder.set(this.docFolder);
          this.service.menu.set(this.menu);
        }
      )
  }
  dataSource = computed(() => this.service.getMediaRecordRS.value());
  selectedRow(row: any) {
    this.rowSelected = row;
    let folder = encodeURIComponent(this.fileFolder);
    let title = row.title;
    this.service.getTextMedia(folder, title)
      .subscribe(
        text => this.textContent = text
      );
  }
}
