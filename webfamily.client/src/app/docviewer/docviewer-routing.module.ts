import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocViewerComponent } from './docviewer.component';
import { PdfViewerComponent } from './pdfviewer/pdfviewer.component';
import { TextviewerComponent } from './textviewer/textviewer.component';
const routes: Routes = [
  {
    path: 'books/:folder',
    component: DocViewerComponent,
    children: [{
      path: ':folder/:title',
      component: PdfViewerComponent
    }]
  },
  {
    path: 'textbooks/:menu/:folder',
    component: TextviewerComponent
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocviewerRoutingModule { }
