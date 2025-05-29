import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Rpm } from '../interfaces/rpm.interface';
import { map } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment'; // Import environment if needed'
@Injectable({
  providedIn: 'root'
})
export class RpmService {
  private http = inject(HttpClient);
  readonly mediaConfig = environment.mediaConfig;
  coverFolder = signal<any>(this.mediaConfig.AssetRpmCoverFolder); // signal
  
  getRpmMenuRS = rxResource<any, any>({
    request: () =>
    ({
      coverFolder: this.coverFolder()
    }),
    loader: ({ request }) => this.http.get<Rpm>('/Rpm/GetRpmMenu')
      .pipe(
        map((data: any) => {
          let result: any[] = [];
          let seq: number = 1;
          for (let v of data) {
            result.push({
              id: seq++,
              recordId: v.recordId,
              coverUrl: request.coverFolder + '/' + v.title,
              folder: v.title.split('.')[0]
            });
          }
          return result;
        })
      )
  })
  //getRpmTracks(recordId: any): Observable<any> {
  //  return this.http.get<any>('/Rpm/GetRpmTracks/' + recordId);
  //}

  recordId = signal<any>(''); // signal
  rpmTrackUrl = signal<any>(''); // signal
  getRpmTracksRS = rxResource<any, any>({
    request: () => {
      const recordId = this.recordId();
      const url = this.rpmTrackUrl();

      // Skip the request if either value is empty/invalid
      if (!recordId || !url) {
        return undefined;
      }

      return { recordId, url };
    },
    loader: ({ request }) => this.http.get<Rpm>('/Rpm/GetRpmTracks/' + request.recordId)
      .pipe(
        map((data: any) => {
          let result: any[] = [];
          let seq: number = 1;
          for (let v of data) {
            result.push({
              id: seq++,
              title: v.title,
              duration: v.duration,
              url: request.url + '/' + v.title,
              type: 'audio/wav'
            });
          }
          return result;
        })
      )
  })
}

