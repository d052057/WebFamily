import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { MediaService } from '../shared/services/media.service';
import { NgxPaginationModule } from 'ngx-pagination';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';


@Component({
  selector: 'app-docviewer',
  imports: [NgxPaginationModule, RouterOutlet],
  templateUrl: './docviewer.component.html',
  styleUrl: './docviewer.component.scss'
})
export class DocViewerComponent {
  processLoading: boolean = false;
  readonly medias = environment.mediaConfig.medias;
  bookIndex: number = -1;
  private mediaService = inject(MediaService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  currentPage = signal(1);
  itemsPerPage = signal(10);

  rowSelected!: any;

  routeParamsResource = rxResource<any, any>({ 
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const folder = params.get('folder') || '';
        const fileFolder = `${this.medias}/books/${params.get('folder')}/`
        const menu = 'books';
        if (folder && fileFolder) { 
        this.mediaService.menu.set(menu);
        this.mediaService.folder.set(folder);
        this.mediaService.fileFolder.set(fileFolder);
        }
        return {
          menu: menu,
          folder: folder,
          fileFolder: fileFolder
        }
      })
    )
  });

  params = computed(() => {
    return this.routeParamsResource.value();
  });
  docResource = this.mediaService.getMediaRecordRS;
  dataSource = computed(() => this.docResource.value());
  constructor() {
  }

  selectedRow(row: any) {
    this.rowSelected = row;
    const localParams = this.params();
    if (localParams?.fileFolder) {
      const fileFolder = localParams.fileFolder;
      if (fileFolder) {
        let folder = encodeURIComponent(fileFolder);
        this.router.navigate([folder, row.title],
          {
            relativeTo: this.activatedRoute
          }
        )
      }
    }
  }
}
