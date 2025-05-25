import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { mediaMenu, mediaDirectory } from '../../models';
import { of } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class MenuServiceService {
  http = inject(HttpClient);
  photoMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/photos/menu.json")
  })
  bookMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/books/menu.json")
  })
  linkMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/links/menu.json")
  })
  videoMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/videos/menu.json")
  })
  movieMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/movies/menu.json")
  })
  musicMenuRS = rxResource({
    loader: () => this.http.get<any>("/json/menus/musics/menu.json")
  })
  menuRS = rxResource({
    loader: () => this.http.get<mediaMenu[]>('/MediaMetaData/GetMenuList')
  })

  menuFolderRecordId = signal<any >('');
  directoryRS = rxResource<any, any>({
    request: () =>
    ({
      recordId: this.menuFolderRecordId()
    }),
    loader: ({ request }) => {
      if (request.recordId.length > 0) {
        return this.http.get<mediaDirectory>('/MediaMetaData/GetDirectoryList/' + request.recordId)
      }
      else {
        return of([] as mediaDirectory[]) ;
      }
    }
  })
  photoMenu = computed(() => this.photoMenuRS.value() as any[]);
  bookMenu = computed(() => this.bookMenuRS.value() as any[]);
  linkMenu = computed(() => this.linkMenuRS.value() as any[]);
  videoMenu = computed(() => this.videoMenuRS.value() as any[]);
  movieMenu = computed(() => this.movieMenuRS.value() as any[]);
  musicMenu = computed(() => this.musicMenuRS.value() as any[]);
  menu = computed(() => this.menuRS.value() as mediaMenu[]);
  directory = computed(() => this.directoryRS.value() as mediaDirectory[]);
  constructor() { }

  getDirectoryList(menuRecordId: any): void {
    this.menuFolderRecordId.set(menuRecordId);
  }
  reloadMenu(): void {
    this.menuRS.reload();
  }
}
