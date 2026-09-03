import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminGuard } from '../shared/guards/admin.guard';
import { AddEditMemberComponent } from './add-edit-member/add-edit-member.component';
import { SeoAdminComponent } from './seo-admin/seo-admin.component';
import { TodoComponent } from './todo-maint/todo.component';
const routes: Routes = [
  {
    path: '',
    runGuardsAndResolvers: 'always',
    canActivate: [AdminGuard],
    children: [
      { path: '', component: AdminComponent },
      { path: 'soaadmin', component: SeoAdminComponent },
      // path for creating a new member
      { path: 'add-edit-member', component: AddEditMemberComponent},
      // path for editing an existing member
      { path: 'add-edit-member/:id', component: AddEditMemberComponent},
      // path for managing todo entries (moved here from the public /todo route)
      { path: 'todo-maint', component: TodoComponent },
      // path for menu maintenance (moved here from the public /menumaint route)
      {
        path: 'menumaint',
        loadComponent: () => import('./menu-maint/menu-maint.component').then(mod => mod.MenuMaintComponent),
        children: [
          {
            path: 'addmenu',
            loadComponent: () => import('./menu-maint/addmenu/addmenu.component').then(mod => mod.AddmenuComponent)
          },
          {
            path: 'delmenu',
            loadComponent: () => import('./menu-maint/delmenu/delmenu.component').then(mod => mod.DelmenuComponent)
          },
          {
            path: 'renamefile',
            loadComponent: () => import('./menu-maint/rename-file-media-list/rename-file-media-list.component').then(mod => mod.RenameFileMediaListComponent)
          },
          {
            path: 'renamemedia',
            loadComponent: () => import('./menu-maint/rename-media/rename-media.component').then(mod => mod.RenameMediaComponent)
          },
          {
            path: 'updatemenu',
            loadComponent: () => import('./menu-maint/updatemenu/updatemenu.component').then(mod => mod.UpdatemenuComponent)
          },
          {
            path: ':menu',
            loadComponent: () => import('./menu-maint/update-video-duration/update-video-duration.component').then(mod => mod.UpdateVideoDurationComponent)
          }
        ]
      },
    ]
  },
]

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AdminRoutingModule { }
