import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tube.component')
      .then(x => x.TubeComponent)
  },
  {
    path: 'tube',
    loadComponent: () => import('./tube.component')
      .then(x => x.TubeComponent)
  },
  {
    path: 'add',
    loadComponent: () => import('./add/add.component')
      .then(x => x.AddComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./add/add.component')
      .then(x => x.AddComponent)
  },
  {
    path: 'tubelink',
    loadComponent: () => import('./tubelink/tubelink.component')
      .then(x => x.TubelinkComponent)
  },
  {
    path: 'downloadyoutube',
    loadComponent: () => import('./download-tube/download-tube.component')
      .then(x => x.DownloadTubeComponent)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TubeRoutingModule { }
