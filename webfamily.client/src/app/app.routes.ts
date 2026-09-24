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
    // :menu is explicit ("movies" or "videos") rather than inferred from the
    // URL, because the literal first segment here is "frames" - not a real
    // menu name - unlike movies/:folder or videos/:folder where the first
    // segment IS the menu.
    path: 'frames/:menu/:folder',
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
    // Replaces the old song/:musics/:folder/:artish and audio/:musics/:folder/:artish
    // routes (PlayAudioComponent / AudioPlayAlbumComponent) - one route now
    // handles any folder depth via the recursive folder tree. :menu must match
    // an existing MediaMenu row (e.g. "musics" - the recursive scan reuses
    // that existing menu rather than adding a new one). Which artist is
    // selected lives in the ?artist= query param instead of a path segment,
    // so it stays bookmarkable without needing a second route definition.
    path: 'song/:menu',
    loadComponent: () => import('./song-browser/song-browser.component')
      .then(mod => mod.SongBrowserComponent)
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


