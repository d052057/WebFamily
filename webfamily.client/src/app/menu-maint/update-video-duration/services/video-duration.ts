import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class VideoDuration {
  private http = inject(HttpClient);

  constructor() { }
  getMediaView(menu: string) {
    switch (menu) {
      case 'videos':
        return this.http.get('/api/menu/videosView')
        break;
      case 'movies':
        return this.http.get('/api/menu/moviesView')
        break;
      default:
        return this.http.get('/api/menu/musicsView')
    }
  }
  updateDuration(data: any): Observable<any> {
    return this.http.post<any>('/api/menu/updateMediasDuration', data)
  }
}
