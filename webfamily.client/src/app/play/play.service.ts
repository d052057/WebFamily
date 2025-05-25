import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlayService {
  private http = inject(HttpClient);


  getPlayers(){
    return this.http.get(`/api/play/get-players`);
  }
}
