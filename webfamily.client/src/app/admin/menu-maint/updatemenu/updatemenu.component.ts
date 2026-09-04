import { Component, OnInit, ViewEncapsulation, inject, ChangeDetectionStrategy } from '@angular/core';
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
  public bookUpdateStatus: any = [];
  public movieUpdateStatus: any = [];
  public videoUpdateStatus: any = [];
  public photoUpdateStatus: any = [];
  public americanSongUpdateStatus: any = [];
  public textUpdateStatus: any = [];
  public rpmUpdateStatus: any = [];
  public initDatabaseStatus: any = [];

  public musicUpdateStatus: any = [];
  public musicsUpdate: boolean = false;
  public booksUpdate: boolean = false;
  public moviesUpdate: boolean = false;
  public videosUpdate: boolean = false;
  public photosUpdate: boolean = false;
  public songsUpdate: boolean = false;
  public textUpdate: boolean = false;
  public rpmsUpdate: boolean = false;
  public initDatabaseUpdate: boolean = false;

  onInitDatabaseUpdate() {
    this.initDatabaseUpdate = true;
    this.initDatabaseStatus = 'Processing...';

    // Show a reassuring message if it takes more than 10 seconds
    const timeoutId = setTimeout(() => {
      if (this.initDatabaseUpdate) {
        this.initDatabaseStatus = 'Still updating the database, please wait...';
      }
    }, 10000);

    this.menuService.initDatabaseUpdate()
      .pipe(
        first(),
        finalize(() => {
          this.initDatabaseUpdate = false;
          clearTimeout(timeoutId); // Clean up timer 
        })
      )
      .subscribe({
        next: (response: any) => {
          this.initDatabaseStatus = response.message || 'Update completed successfully!';
        },
        error: (err) => {
          // Fallback if err.error is an object or string
          this.initDatabaseStatus = err.error?.message || err.error || 'An error occurred.';
        }
      });
  }

  onUpdate(menu: string) {
    
    switch (menu) {
      case 'books':
        this.booksUpdate = true;
        this.bookUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.booksUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.bookUpdateStatus = data; },
              error: error => this.bookUpdateStatus = error
            }
          )
        break;
      case 'movies':
        this.moviesUpdate = true;
        this.movieUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.moviesUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.movieUpdateStatus = data; },
              error: error => this.movieUpdateStatus = error
            }
          )
        break;
      case 'videos':
        this.videosUpdate = true;
        this.videoUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.videosUpdate = false))
          .subscribe(
            {
              next: (data: any) => {
                this.videoUpdateStatus = data
              },
              error: error => {
                this.videoUpdateStatus = error;
              }
            }
          )
        break;
      case 'musics':
        this.musicsUpdate = true;
        this.musicUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.musicsUpdate = false))
          .subscribe(
            {
              next: (data: any[]) => { this.musicUpdateStatus = data; },
              error: (err) => { this.musicUpdateStatus.push(JSON.stringify(err)) }
            }
          )
        this.musicsUpdate = false;
        break;
      case 'americansongs':
        this.songsUpdate = true;
        this.americanSongUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.songsUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.americanSongUpdateStatus = data; },
              error: error => this.americanSongUpdateStatus = error
            }
          )
        break;
      case 'text':
        this.textUpdate = true;
        this.textUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.songsUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.textUpdateStatus = data; },
              error: error => this.textUpdateStatus = error
            }
          )
        break;
      case 'photos':
        this.photosUpdate = true;
        this.photoUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.photosUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.photoUpdateStatus = data; },
              error: error => this.photoUpdateStatus = error
            }
          )
        break;
      case 'rpms':
        this.rpmsUpdate = true;
        this.rpmUpdateStatus = ['Processing...'];
        this.mediaservice.updateMetaData(menu)
          .pipe(first())
          .pipe(finalize(() => this.rpmsUpdate = false))
          .subscribe(
            {
              next: (data: any) => { this.rpmUpdateStatus = data; },
              error: error => this.rpmUpdateStatus = error
            }
          )
        break;
    }
  }
}
