import { Component, OnInit, ViewEncapsulation, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MediaService } from '../../../shared/services/media.service';
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
  public bookUpdateStatus = signal<any>([]);
  public movieUpdateStatus = signal<any>([]);
  public videoUpdateStatus = signal<any>([]);
  public photoUpdateStatus = signal<any>([]);
  public americanSongUpdateStatus = signal<any>([]);
  public textUpdateStatus = signal<any>([]);
  public rpmUpdateStatus = signal<any>([]);
  public initDatabaseStatus = signal<any>([]);

  public musicUpdateStatus = signal<any>([]);
  public musicsUpdate = signal(false);
  public booksUpdate = signal(false);
  public moviesUpdate = signal(false);
  public videosUpdate = signal(false);
  public photosUpdate = signal(false);
  public songsUpdate = signal(false);
  public textUpdate = signal(false);
  public rpmsUpdate = signal(false);
  public initDatabaseUpdate = signal(false);

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
      case 'books':
        this.booksUpdate.set(true);
        this.bookUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.booksUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.bookUpdateStatus.set(data); },
              error: error => this.bookUpdateStatus.set(error)
            }
          )
        break;
      case 'movies':
        this.moviesUpdate.set(true);
        this.movieUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.moviesUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.movieUpdateStatus.set(data); },
              error: error => this.movieUpdateStatus.set(error)
            }
          )
        break;
      case 'videos':
        this.videosUpdate.set(true);
        this.videoUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.videosUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => {
                this.videoUpdateStatus.set(data)
              },
              error: error => {
                this.videoUpdateStatus.set(error);
              }
            }
          )
        break;
      case 'musics':
        this.musicsUpdate.set(true);
        this.musicUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.musicsUpdate.set(false)))
          .subscribe(
            {
              next: (data: any[]) => { this.musicUpdateStatus.set(data); },
              error: (err) => { this.musicUpdateStatus.update(list => [...list, JSON.stringify(err)]); }
            }
          )
        break;
      case 'americansongs':
        this.songsUpdate.set(true);
        this.americanSongUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.songsUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.americanSongUpdateStatus.set(data); },
              error: error => this.americanSongUpdateStatus.set(error)
            }
          )
        break;
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
      case 'photos':
        this.photosUpdate.set(true);
        this.photoUpdateStatus.set(['Processing...']);
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.photosUpdate.set(false)))
          .subscribe(
            {
              next: (data: any) => { this.photoUpdateStatus.set(data); },
              error: error => this.photoUpdateStatus.set(error)
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
