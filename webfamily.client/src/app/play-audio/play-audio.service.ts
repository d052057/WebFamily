import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs/internal/Observable';
export interface folder {
  directory: string;
}
@Injectable({
  providedIn: 'root'
})
export class PlayAudioService {
  private http = inject(HttpClient);

  //getRockDirectory(): Observable<any> {
  //  return this.http.get<any>('/MediaMetaData/GetRockDirectory')
  //}
  rockDirectoryResource = rxResource< folder[], any>({
    loader: () => this.http.get<folder[]>('/MediaMetaData/GetRockDirectory'),
  });
}
