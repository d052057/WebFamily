import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./menu-maint.component')
      .then(mod => mod.MenuMaintComponent),
      children: [
        {
          path: 'addmenu',
          loadComponent: () => import('./addmenu/addmenu.component')
            .then(mod => mod.AddmenuComponent)
        },
        {
          path: 'delmenu',
          loadComponent: () => import('./delmenu/delmenu.component')
            .then(mod => mod.DelmenuComponent)
        },
        {
          path: 'renamefile',
          loadComponent: () => import('./rename-file-media-list/rename-file-media-list.component')
            .then(mod => mod.RenameFileMediaListComponent)
        },
        {
          path: 'renamemedia',
          loadComponent: () => import('./rename-media/rename-media.component')
            .then(mod => mod.RenameMediaComponent)
        },
        {
          path: 'updatemenu',
          loadComponent: () => import('./updatemenu/updatemenu.component')
            .then(mod => mod.UpdatemenuComponent)
        },
        {
          path: 'updatevideosduration/:menu',
          loadComponent: () => import('./update-video-duration/update-video-duration.component')
            .then(mod => mod.UpdateVideoDurationComponent)
        }
      ]    
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MenuMaintRoutingModule { }
