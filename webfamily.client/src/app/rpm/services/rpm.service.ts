import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Rpm } from '../interfaces/rpm.interface';
import { map, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
@Injectable({
  providedIn: 'root'
})
export class RpmService {
  private http = inject(HttpClient);
  router = inject(Router);
  coverFolder = signal<any>(''); // signal
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
  getRpmTracks(recordId: any): Observable<any> {
    return this.http.get<any>('/Rpm/GetRpmTracks/' + recordId);
  }
}
