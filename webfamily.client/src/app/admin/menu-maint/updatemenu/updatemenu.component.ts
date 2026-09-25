import { Component, ViewEncapsulation, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MediaFolderTreeService } from '../../../shared/services/media-folder-tree.service';
import { catchError, concatMap, finalize, first, from, map, of, toArray } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-updatemenu',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './updatemenu.component.html',
  styleUrls: ['./updatemenu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class UpdatemenuComponent {
  folderTreeService = inject(MediaFolderTreeService);
 
  public rpmUpdateStatus = signal<any>([]);
  public initDatabaseStatus = signal<any>([]);

  public songsFolderTreeStatus = signal<any>([]);
  public moviesFolderTreeStatus = signal<any>([]);
  public videosFolderTreeStatus = signal<any>([]);
  public booksFolderTreeStatus = signal<any>([]);
  public photosFolderTreeStatus = signal<any>([]);


  public rpmsUpdate = signal(false);

  public initDatabaseUpdate = signal(false);
  public songsFolderTreeUpdate = signal(false);
  public moviesFolderTreeUpdate = signal(false);
  public videosFolderTreeUpdate = signal(false);
  public booksFolderTreeUpdate = signal(false);
  public photosFolderTreeUpdate = signal(false);

  // Regenerates MediaFolder/MediaTrack from disk for one menu.
  onScanFolderTree(menu: 'musics' | 'movies' | 'videos' |'books'|'photos') {
  
    const updateMap = {
      musics: this.songsFolderTreeUpdate,
      movies: this.moviesFolderTreeUpdate,
      videos: this.videosFolderTreeUpdate,
      books: this.booksFolderTreeUpdate,
      photos: this.photosFolderTreeUpdate,
    };

    // 2. Map each menu item to its respective Status Signal
    const statusMap = {
      musics: this.songsFolderTreeStatus,
      movies: this.moviesFolderTreeStatus,
      videos: this.videosFolderTreeStatus,
      books: this.booksFolderTreeStatus,
      photos: this.photosFolderTreeStatus,
    };

    // 3. Dynamically pick the right signals based on the active menu
    const updateSignal = updateMap[menu];
    const statusSignal = statusMap[menu];

    updateSignal.set(true);
    statusSignal.set(['Processing...']);
    this.folderTreeService.scanFolderTree(menu)
      .pipe(first())
      .pipe(finalize(() => updateSignal.set(false)))
      .subscribe({
        next: (data: string[]) => { statusSignal.set(data); },
        error: (err) => { statusSignal.set([JSON.stringify(err)]); }
      });
  }

  // Clears and rebuilds MediaFolder/MediaTrack for musics, movies, videos and
  // books in one click - each is scanFolderTree's own existing per-menu
  // clear-then-rebuild (see MediaFolderScanService.ScanAsync), just run one
  // after another (concatMap, not parallel) so they aren't all hammering the
  // database's MediaFolder/MediaTrack tables for different menus at once.
  // Photos deliberately left out - not asked for here, run its own
  // "Regenerate Photos Folder Tree" button above if needed.
  onInitDatabaseUpdate() {
    this.initDatabaseUpdate.set(true);
    this.initDatabaseStatus.set(['Processing...']);

    const menus: Array<'musics' | 'movies' | 'videos' | 'books'> = ['musics', 'movies', 'videos', 'books'];

    from(menus).pipe(
      concatMap(menu =>
        this.folderTreeService.scanFolderTree(menu).pipe(
          map(result => ({ menu, result })),
          catchError(err => of({ menu, result: [`Error: ${JSON.stringify(err.error ?? err.message ?? err)}`] }))
        )
      ),
      toArray(),
      finalize(() => this.initDatabaseUpdate.set(false))
    ).subscribe(results => {
      const combined = results.flatMap(({ menu, result }) => [`--- ${menu} ---`, ...result]);
      this.initDatabaseStatus.set(combined);
    });
  }
}
