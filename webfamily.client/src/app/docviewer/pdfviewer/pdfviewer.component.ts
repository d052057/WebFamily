import { Component, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { map, Subject, takeUntil } from 'rxjs';
import { MediaService } from '../../shared/services/media.service';

@Component({
  selector: 'app-pdfviewer',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './pdfviewer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pdfviewer.component.scss'
})
export class PdfViewerComponent {
  pdfFile: string = '';
  docTitle: string = '';
  activatedRoute = inject(ActivatedRoute);
  mediaService = inject(MediaService);

  //private destroy$ = new Subject<void>();
  //params: any = {
  //  type: '',
  //  folder: '',
  //  title: '',
  //  pdfFile: ''
  //};
  routeParamsResource = rxResource({
    stream: () => this.activatedRoute.paramMap.pipe(
      map((params: any) => {
        const type = this.detectFileType(params.get('title'));
        const docTitle = params.get('title') || '';
        this.docTitle = docTitle;
        const folder = decodeURIComponent(params.get('folder') || '');
        this.docTitle = docTitle;
        const pdfFile = `${folder}${docTitle}`;
        this.pdfFile = pdfFile;
        if (pdfFile && type) {
          if (type === 'text') {
            this.mediaService.textFolder.set(folder);
            this.mediaService.textFileName.set(docTitle);
          }
        }
        return {
          type: type,
          folder: folder,
          title: docTitle,
          pdfFile: pdfFile
        };
      })
    )
  });
  routeParams = computed(() => this.routeParamsResource.value());
  textDocResource = this.mediaService.textDocResource;
  textContent = computed(() => { return this.textDocResource.value(); });
  //ngOnInit(): void {
  //  this.activatedRoute.paramMap
  //    .pipe(takeUntil(this.destroy$))
  //    .subscribe(params => {
  //      const type = this.detectFileType(params.get('title') || '');
  //      const docTitle = params.get('title') || '';
  //      this.docTitle = docTitle;
  //      const folder = decodeURIComponent(params.get('folder') || '');
  //      this.docTitle = docTitle;
  //      const pdfFile = `${folder}${docTitle}`;
  //      this.pdfFile = pdfFile;
  //      if (pdfFile && type) {
  //        if (type === 'text') {
  //          this.mediaService.textFolder.set(folder);
  //          this.mediaService.textFileName.set(docTitle);
  //        }
  //      }
  //      this.params = {
  //        type: type,
  //        folder: folder,
  //        title: docTitle,
  //        pdfFile: pdfFile
  //      };
  //    });
  //}
  //ngOnDestroy(): void {
  //  // Complete the destroy subject to automatically unsubscribe all observables
  //  this.destroy$.next();
  //  this.destroy$.complete();
  //}
  constructor() {
  }
  detectFileType(fileName: string): 'pdf' | 'text' {
    if (fileName.endsWith('.txt')) {
      return 'text';
    }
    return fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text';
  }

}
