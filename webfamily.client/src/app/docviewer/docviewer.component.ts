import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { finalize, map } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { Router, ActivatedRoute, RouterOutlet, OutletContext } from '@angular/router';

@Component({
  selector: 'app-docviewer',
  imports: [CommonModule,  NgxPaginationModule, RouterOutlet],
  templateUrl: './docviewer.component.html',
  styleUrl: './docviewer.component.scss'
})
export class DocViewerComponent {
  processLoading: boolean = false;
  medias!: any;

  bookIndex: number = -1;
  private service = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  currentPage = signal(1);
  itemsPerPage = signal(10);

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
          this.menu = this.activatedRoute.snapshot.url[0].path; // should return books
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
    this.router.navigate([folder, row.title],
      {
        relativeTo: this.activatedRoute
      }
    )
  }
}
