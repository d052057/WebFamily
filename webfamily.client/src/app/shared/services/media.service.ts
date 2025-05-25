import { Injectable, OnInit,  inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { menuType, mediaMetaDatum } from '../../models';
import { map, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})

export class MediaService  {
  private http = inject(HttpClient);
  public router = inject(Router);
  // Http Options
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  }
  textHttpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'text/plain'
    })
  }
  deleteMenuItem(recordId: any): Observable<any> {
    return this.http.delete<any>( '/MediaMetaData/RemoveMediaDirectory/' + recordId, this.httpOptions)
  }

  // Add menu item Record
  createMenuItem(record: any): Observable<any> {
    return this.http.post<any>('/MediaMetaData/AddMediaDirectory', JSON.stringify(record), this.httpOptions)
  }
  AddLink(record: any): Observable<any> {
    return this.http.post<any>( '/MediaMetaData/AddLink', JSON.stringify(record), this.httpOptions)
  }
  RemoveLink(record: string): Observable<any> {
    return this.http.delete<any>('/MediaMetaData/RemoveLink/' + encodeURIComponent(record), this.httpOptions)
  }
  updateMetaData(menu: string): Observable<any> {
    let menutype = new menuType;
    menutype.menuId = menu;
    return this.http.put<any>( '/updatedatabase/updateMetaData', JSON.stringify(menutype), this.httpOptions)
  }

  refreshMenu() {
    this.router.navigate([''])
      .then(() => {
        window.location.reload();
      });
  }
  // Get text Documents
  getTextMedia(folder: string, fileName: string): Observable<any> {
    let file = decodeURIComponent(folder) + fileName;
    return this.http.get(file, { responseType: 'text' })
  }
  // Get mediaMetaData

  //getMedia(folder: string, menu: string): Observable<any> {
  //  return this.http.get<any>( '/MediaMetaData/GetFilesByFolder?folder=' + folder + "&menu=" + menu)
  //}

  rockFolder = signal<any>('');
  rockFileFolder = signal<any>('');
  getRockMediaRecordRS = rxResource<any, any>({
    request: () =>
    ({
      folder: this.rockFolder(),
      fileFolder: this.rockFileFolder()
    }),
    loader: ({ request }) => {
      if ((request.folder.length > 0)) {
        return this.http.get<any[]>('/MediaMetaData/GetRockSong/' + encodeURIComponent(request.folder))
        .pipe(
          map((data: any) => {
            let result: any[] = [];
            let seq: number = 1;
            for (let v of data) {
              result.push({
                id: seq++,
                url: request.fileFolder + "/" + v.name,
                title: v.name,
                cover: v.cover,
                type: v.type
              });
            }
            return result;
          }),
        )
      }
      else {
        return of([] as any[]);
      }
    }
  })
 
  folder = signal<any>('');
  menu = signal<any>('');
  fileFolder = signal<any>('');
  getMediaRecordRS = rxResource<any, any>({
    request: () =>
    ({
      folder: this.folder(),
      menu: this.menu(),
      fileFolder: this.fileFolder()
    }),
    loader: ({ request }) => {
      if ((request.folder.length > 0) && (request.menu.length > 0)) {
        return this.http.get<mediaMetaDatum[]>( '/MediaMetaData/GetFilesByFolder?folder=' + request.folder + "&menu=" + request.menu)
          .pipe(
            map((data: any) => {
              let result: any[] = [];
              let seq: number = 1;
              for (let v of data.mediaMetaData) {
                //Change the format of the data
                result.push({
                  id: seq++,
                  title: v.title,
                  duration: v.duration,
                  url: request.fileFolder + "/" + v.title,
                  cover: '',
                  type: v.type
                });
              };
              return result;
            })
        )
      }
      else {
        return of([] as any[]);
      }
    }
  })

  RenameMediafile(record: any): Observable<any> {
    return this.http.post<any>( '/MediaMetaData/RenameMediafile', JSON.stringify(record), this.httpOptions)
  }

  getById(id: string) {
    return this.http.get<any>('/MediaMetaData/getById/' + `${id}`);
  }
  deleteMedia(id: string) {
    return this.http.delete( '/MediaMetaData/deleteById/' + `${id}`)
  }

  getMediaView(menu: string) {
    switch (menu) {
      case 'videos':
        return this.http.get( '/MediaMetaData/videosView')
        break;
      case 'movies':
        return this.http.get( '/MediaMetaData/moviesView')
        break;
      default:
        return this.http.get( '/MediaMetaData/musicsView')
    }
  }
  updateDuration(data: any): Observable<any> {
    return this.http.post<any>( '/MediaMetaData/updateMediasDuration', JSON.stringify(data), this.httpOptions)
  }

}
