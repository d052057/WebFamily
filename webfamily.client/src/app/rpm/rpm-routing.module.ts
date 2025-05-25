import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./rpm.component')
      .then(mod => mod.RpmComponent),
    children: [
      {
        path: 'rpmplayer/:recordId/:rpmfolder',
        loadComponent: () => import('./rpm-player/rpm-player.component')
          .then(mod => mod.RpmPlayerComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RpmRoutingModule { }
