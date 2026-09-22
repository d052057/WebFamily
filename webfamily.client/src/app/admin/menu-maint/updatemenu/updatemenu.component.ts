import { Component, ViewEncapsulation, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MediaService } from '../../../shared/services/media.service';
import { MediaFolderTreeService } from '../../../shared/services/media-folder-tree.service';
import { finalize, first } from 'rxjs';
import { MenuService } from '../../../shared/services/menu.service';
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
  mediaservice = inject(MediaService);
  menuService = inject(MenuService);
  folderTreeService = inject(MediaFolderTreeService);
 
  public textUpdateStatus = signal<any>([]);
  public rpmUpdateStatus = signal<any>([]);
  public initDatabaseStatus = signal<any>([]);

  public songsFolderTreeStatus = signal<any>([]);
  public moviesFolderTreeStatus = signal<any>([]);
  public videosFolderTreeStatus = signal<any>([]);
  public booksFolderTreeStatus = signal<any>([]);
  public photosFolderTreeStatus = signal<any>([]);


  public textUpdate = signal(false);
  public rpmsUpdate = signal(false);

  public initDatabaseUpdate = signal(false);
  public songsFolderTreeUpdate = signal(false);
  public moviesFolderTreeUpdate = signal(false);
  public videosFolderTreeUpdate = signal(false);
  public booksFolderTreeUpdate = signal(false);
  public photosFolderTreeUpdate = signal(false);

  // Regenerates MediaFolder/MediaTrack from disk for one menu - the new
  // recursive folder-tree scan, separate from the legacy updateMetaData path
  // the buttons below still use for other menus (books, photos, text, rpms,
  // and the legacy single-level "BOM" data movies/videos also still have).
  onScanFolderTree(menu: 'musics' | 'movies' | 'videos' |'books'|'photos') {
    //const updateSignal = menu === 'musics' ? this.songsFolderTreeUpdate
    //  : menu === 'movies' ? this.moviesFolderTreeUpdate
    //  : this.videosFolderTreeUpdate;
    //const statusSignal = menu === 'musics' ? this.songsFolderTreeStatus
    //  : menu === 'movies' ? this.moviesFolderTreeStatus
    //  : this.videosFolderTreeStatus;
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

  onInitDatabaseUpdate() {
    this.initDatabaseUpdate.set(true);
    this.initDatabaseStatus.set('Processing...');
    this.menuService.initDatabaseUpdate()
      .pipe(first())
      .pipe(finalize(() => this.initDatabaseUpdate.set(false)))
      .subscribe({
        next: (response: any) => {
          this.initDatabaseStatus.set(response.message);
        },
        error: (err) => {
          this.initDatabaseStatus.set(err.error);
        }
      }
    );
    
  }
  onUpdate(menu: string) {
    
    switch (menu) {   
      case 'text':
        this.textUpdate.set(true);
        this.textUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.textUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.textUpdateStatus.set(data); },
              error: error => this.textUpdateStatus.set(error)
            }
          )
        break;
      case 'rpms':
        this.rpmsUpdate.set(true);
        this.rpmUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.rpmsUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.rpmUpdateStatus.set(data); },
              error: error => this.rpmUpdateStatus.set(error)
            }
          )
        break;
    }
  }
}
