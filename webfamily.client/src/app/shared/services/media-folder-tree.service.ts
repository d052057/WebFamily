import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { MediaFolderTreeDto } from '../../models/media-folder-tree.model';

@Injectable({
  providedIn: 'root'
})
export class MediaFolderTreeService {
  private http = inject(HttpClient);

  // Which library to browse (e.g. "songs", "musics") - set this and the
  // resource below refetches automatically.
  readonly menu = signal<string>('');

  readonly treeResource = rxResource<MediaFolderTreeDto[], { menu: string }>({
    params: () => ({ menu: this.menu() }),
    stream: ({ params }) =>
      params.menu
        ? this.http.get<MediaFolderTreeDto[]>(`/MediaFolder/Tree/${params.menu}`)
        : of([])
  });

  // Triggers MediaFolderScanService on the server: recursively rescans the
  // configured root folder for this menu and rebuilds MediaFolder/MediaTrack.
  // Returns the same kind of per-folder status list as the legacy updateMetaData call.
  scanFolderTree(menu: string): Observable<string[]> {
    return this.http.post<string[]>(`/MediaFolder/Scan?menu=${menu}`, null);
  }
}

