import { Routes } from '@angular/router';
import { NotFoundComponent } from './shared/components/errors/not-found/not-found.component';
import { PlayComponent } from './play/play.component';
import { AuthorizationGuard } from './shared/guards/authorization.guard';
import { ContactComponent } from './contact/contact.component';

const todoModule = () => import('./todo/todo.module').then(x => x.TodoModule);
const tubeModule = () => import('./tube/tube.module').then(x => x.TubeModule);

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadChildren: () => import('./home/home.module').then(module => module.HomeModule) },
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
    path: 'bootstrap',
    loadComponent: () => import('./bootstrap-example/bootstrap-example.component')
      .then(mod => mod.BootstrapExampleComponent),
    children: [
      {
        path: 'bootstrap-icons',
        loadComponent: () => import('./bootstrap-example/bootstrap-icons/bootstrap-icons.component')
          .then(mod => mod.BootstrapIconsComponent)
      },
      {
      path: ':item',
      loadComponent: () => import('./bootstrap-example/display-boot-feature/display-boot-feature.component')
        .then(mod => mod.DisplayBootFeatureComponent)
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
  {
    path: 'books/:folder',
    loadComponent: () => import('./docviewer/docviewer.component')
      .then(mod => mod.DocViewerComponent),
    children: [
      {
        path: ':folder/:title',
        loadComponent: () => import('./docviewer/pdfviewer/pdfviewer.component')
          .then(mod => mod.PdfViewerComponent)
      }
    ]
  },
  {
    path: 'tax-estimate',
    loadComponent: () => import('./tax-estimate/tax-estimate.component')
      .then(mod => mod.TaxEstimateComponent)
  },
  {
    path: 'help',
    loadComponent: () => import('./help-reminder/help-reminder')
      .then(mod => mod.HelpReminder)
  },
  {
    path: 'gps',
    loadComponent: () => import('./gpsmap/gpsmap')
      .then(mod => mod.GPSMapComponent)
  },
  {
    path: 'googlemap',
    loadComponent: () => import('./googlegpsmap/googlegpsmap')
      .then(mod => mod.Googlegpsmap)
  },
  {
    path: 'animate', loadComponent: () => import('./animate/animate')
      .then(mod => mod.Animate)
  },
  { path: 'contact', component: ContactComponent },
  { path: 'account', loadChildren: () => import('./account/account.module').then(module => module.AccountModule) },
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent, pathMatch: 'full' }
];


