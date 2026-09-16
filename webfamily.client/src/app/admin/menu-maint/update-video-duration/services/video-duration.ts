import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Urlbase } from '../../../../shared/services/urlbase'

@Service()
export class VideoDuration {
  private http = inject(HttpClient);
  private urlbase = inject(Urlbase);
  private apiBase!: string;
  constructor() {
    const segment = this.urlbase.baseUrl();
    this.apiBase = segment ? `/${segment}/api/menu` : '/api/menu';

  }
  getMediaView(menu: string) {
    switch (menu) {
      case 'videos':
        return this.http.get(`${this.apiBase}/videosView`)
        break;
      case 'movies':
        return this.http.get(`${this.apiBase}/moviesView`)
        break;
      default:
        return this.http.get(`${this.apiBase}/musicsView`)
    }
  }
  updateDuration(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/updateMediasDuration`, data)
  }
}
