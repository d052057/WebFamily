import { Injectable, OnInit, inject, resource, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { expand, map, Observable, of, reduce, takeWhile } from 'rxjs';
import { Router } from '@angular/router';
import { YTSettings, Webtube } from './../models/webtubes.model';
import { TubeSeries } from './../models/tube-series';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class TubeService implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  private urlYouTube: string = YTSettings.YOUTUBE_URL;
  private urlYouTubeId: string = YTSettings.YOUTUBE_URL_ID;
  _seqNum!: number;
  public videoListId = signal<string>('');
  public record = new Webtube;

  ngOnInit(): void {
  }
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
  youtube = rxResource<any, any>({
    request: () =>
    ({
      videoListId: this.videoListId()
    }),
    loader: ({ request }) => {
      if (request.videoListId.length > 0) {
        let url = this.urlYouTube + request.videoListId;
        let seqNum = 0;
        return this.http.get(url)
          .pipe(
            expand((response: any) =>
              this.getNextVideoPage(response['nextPageToken'])
            ),

            takeWhile((response: any) => !!response['nextPageToken'], true),
            reduce((all: any, data: any) => all.concat(data.items), []),
            map((response: any) => {
              return this.parseYoutubeVideoList(response, seqNum);
            })
          );
      } else {
        return of([] as TubeSeries[]);
      }
    },
  });
  private parseYoutubeVideoList(response: any, _seqNum: number) {
    const result = [];
    for (let v of response) {
      if (v.snippet.title !== 'Deleted video') {
        _seqNum++;
        result.push(new TubeSeries(v, _seqNum));
        console.log(_seqNum);
      }
    }
    return result;
  }
  asyncTubeRecordsRS = resource<any[], any>({
    loader: async () => fetch('/Tube/Gettubes')
      .then(
        (res) => {
          return res.json() as Promise<any[]>
        }
      )
  });
  tubeRecordsRS = rxResource<any[], any>({
    loader: () => this.http.get<any[]>('/Tube/Gettubes')
  });

  getRecordById(id: string): Observable<any> {
    return this.http.get<any>('/Tube/GetLinkTubeById/' + id);
  }

  downloadYoutube(record: any): Observable<any> {
    return this.http.post<any>('/Tube/DownloadYoutube', JSON.stringify(record), this.httpOptions);
  }
  private getNextVideoPage(_token: string) {
    let url = (this.urlYouTube + this.videoListId() + '&pageToken=' + _token);
    return this.http.get(url);
  }
  getYoutubeVideoById(id: string): Observable<any> {
    var youtubelink = this.urlYouTubeId + id;
    return this.http.get(youtubelink);
  }
  createWebtube(record: Webtube): Observable<Webtube> {
    record.recordId = '00000000-0000-0000-0000-000000000000';
    return this.http.post<Webtube>('/Tube/Add', JSON.stringify(record), this.httpOptions);
  }

  updateWebtube(record: Webtube): Observable<Webtube> {
    let header = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.put<Webtube>('/Tube/Update', JSON.stringify(record), this.httpOptions)
  }
  deleteWebtube(id: string) {
    let header = new HttpHeaders({
     'Content-Type': ''
    });

    return this.http.delete<any>('/Tube/Delete/' +  `${id}`)
  }
}
