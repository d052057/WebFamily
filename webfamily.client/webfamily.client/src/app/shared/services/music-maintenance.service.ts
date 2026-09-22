import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Talks to MusicMaintenanceController - rename/delete for the
// MediaFolder/MediaTrack tree (the same tables song-browser reads via
// MediaFolderTreeService). Separate from MenuService's legacy
// RenameFile/DeleteFile, which operate on the older MediaMetaData table set.
@Injectable({
  providedIn: 'root'
})
export class MusicMaintenanceService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/musicmaintenance';

  renameFolder(folderId: string, newName: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/RenameFolder`, { folderId, newName });
  }

  renameTrack(trackId: string, newFileName: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/RenameTrack`, { trackId, newFileName });
  }

  deleteFolder(folderId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Folder/${folderId}`);
  }

  deleteTrack(trackId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Track/${trackId}`);
  }
}
