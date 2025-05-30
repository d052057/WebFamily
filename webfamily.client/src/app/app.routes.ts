import { Routes } from '@angular/router';
import { NotFoundComponent } from './shared/components/errors/not-found/not-found.component';
import { PlayComponent } from './play/play.component';
import { AuthorizationGuard } from './shared/guards/authorization.guard';
import { ContactComponent } from './contact/contact.component';

const todoModule = () => import('./todo/todo.module').then(x => x.TodoModule);
const tubeModule = () => import('./tube/tube.module').then(x => x.TubeModule);
const menuMaint = () => import('./menu-maint/menu-maint.module').then(routes => routes.MenuMaintModule);
const docViewerModule = () => import('../app/docviewer/docviewer.module').then(routes => routes.DocviewerModule);

export const routes: Routes = [
  { path: '', loadChildren: () => import('./home/home.module').then(module => module.HomeModule) },
  {
    path: '',
    runGuardsAndResolvers: 'always',
    canActivate: [AuthorizationGuard],
    children: [
      { path: 'play', component: PlayComponent },

      { path: 'admin', loadChildren: () => import('./admin/admin.module').then(module => module.AdminModule) },

    ],
  },
  {
    path: 'todo',
    loadChildren: todoModule
  },
  {
    path: 'doc',
    loadChildren: docViewerModule
  },
  {
    path: 'videos/:folder',
    loadComponent: () => import('./play-media/play-media.component')
      .then(mod => mod.PlayMediaComponent)
  },
  {
    path: 'movies/:folder',
    loadComponent: () => import('./play-media/play-media.component')
      .then(mod => mod.PlayMediaComponent)
  },
  {
    path: 'frames/:folder',
    loadComponent: () => import('./video-view-frame/video-view-frame.component')
      .then(mod => mod.VideoViewFrameComponent)
  },
  {
    path: 'photos/:folder',
    loadComponent: () => import('./photo/photo.component')
      .then(mod => mod.PhotoComponent)
  },
  {
    path: 'musics/:folder',
    loadComponent: () => import('./play-media/play-media.component')
      .then(mod => mod.PlayMediaComponent)
  },
  {
    path: 'rpm',
    loadComponent: () => import('./rpm/rpm.component')
      .then(mod => mod.RpmComponent)
  },
  {
    path: 'tube',
    loadChildren: tubeModule
  },
  {
    path: 'tubelink',
    loadComponent: () => import('./tube/tubelink/tubelink.component')
      .then(mod => mod.TubelinkComponent)
  },
  {
    path: 'menumaint',
    loadChildren: menuMaint

  },
  {
    path: 'bootstrap',
    loadComponent: () => import('./bootstrap-example/bootstrap-example.component')
      .then(mod => mod.BootstrapExampleComponent),
    children: [{
      path: 'bootstrap/:item',
      loadComponent: () => import('./bootstrap-example/display-boot-feature/display-boot-feature.component')
        .then(mod => mod.DisplayBootFeatureComponent)
    },
    {
      path: 'bootstrap-icons',
      loadComponent: () => import('./bootstrap-example/bootstrap-icons/bootstrap-icons.component')
        .then(mod => mod.BootstrapIconsComponent)
    }

    ]
  },
  {
    path: 'song/:musics/:folder/:artish',
    loadComponent: () => import('./play-audio/play-audio.component')
      .then(mod => mod.PlayAudioComponent)
  },
  {
    path: 'audio/:musics/:folder/:artish',
    loadComponent: () => import('./audio-play-album/audio-play-album.component')
      .then(mod => mod.AudioPlayAlbumComponent)
  },
  { path: 'contact', component: ContactComponent },
  { path: 'account', loadChildren: () => import('./account/account.module').then(module => module.AccountModule) },
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent, pathMatch: 'full' }
];


