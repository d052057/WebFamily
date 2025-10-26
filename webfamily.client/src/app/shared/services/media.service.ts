import { Injectable, OnInit,  inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { menuType, mediaMetaDatum } from '../../models';
import { map, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
export interface folder {
  directory: string;
}
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
  textFolder = signal<any>('');
  textFileName = signal<any>('');
  textDocResource = rxResource<any, any>({
    params: () => ({
      folder: this.textFolder(),
      fileName: this.textFileName()
    }),
    stream: ({ params }) => {
      if ((params.folder.length > 0) && (params.fileName.length > 0)) {
        return this.http.get(`${decodeURIComponent(params.folder)}${params.fileName}`, { responseType: 'text' })
      } else {
        return of('');
      }
    }

  });

  rockDirectoryResource = rxResource<folder[], any>({
    stream: () => this.http.get<folder[]>('/MediaMetaData/GetRockDirectory'),
  });

  rockFolder = signal<any>('');
  rockFileFolder = signal<any>('');
  getRockMediaRecordRS = rxResource<any, any>({
    params: () =>
    ({
      folder: this.rockFolder(),
      fileFolder: this.rockFileFolder()
    }),
    stream: ({ params }) => {
      if ((params.folder.length > 0)) {
        return this.http.get<any[]>('/MediaMetaData/GetRockSong/' + encodeURIComponent(params.folder))
        .pipe(
          map((data: any) => {
            let result: any[] = [];
            let seq: number = 1;
            for (let v of data) {
              result.push({
                id: seq++,
                url: params.fileFolder + "/" + v.name,
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
    params: () =>
    ({
      folder: this.folder(),
      menu: this.menu(),
      fileFolder: this.fileFolder()
    }),
    stream: ({ params }) => {
      if ((params.folder.length > 0) && (params.menu.length > 0)) {
        return this.http.get<mediaMetaDatum[]>('/MediaMetaData/GetFilesByFolder?folder=' + params.folder + "&menu=" + params.menu)
          .pipe(
            map((data: any) => {
              let result: any[] = [];
              let seq: number = 1;
              for (let v of data.mediaMetaData) {
                //Change the format of the data
                result.push({
                  id: seq++,
                  recordId: v.recordId,
                  title: v.title,
                  duration: v.duration,
                  url: params.fileFolder + "/" + v.title,
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

  getById(id: string) {
    return this.http.get<any>('/MediaMetaData/getById/' + `${id}`);
  }


}
