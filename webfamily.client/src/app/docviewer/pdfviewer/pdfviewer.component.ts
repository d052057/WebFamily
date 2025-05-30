import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxExtendedPdfViewerModule} from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-pdfviewer',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './pdfviewer.component.html',
  styleUrl: './pdfviewer.component.scss'
})
export class PdfViewerComponent implements OnInit {
  folder: string = '';
  title: string = '';
  pdfFile: string = '';
  activatedRoute = inject(ActivatedRoute);
  ngOnInit(): void {
    this.activatedRoute.paramMap
      .subscribe(
        (params: any) => {
          this.folder = decodeURIComponent( params.get('folder'));
          this.title = params.get('title');
          this.pdfFile = this.folder + this.title;
        }
      );
  }
}
