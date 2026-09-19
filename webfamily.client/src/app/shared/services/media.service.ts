import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { menuType, mediaMetaDatum } from '../../models';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { VideoTrack } from '../video-player/interfaces/videoplayer.interface';
export interface folder {
  directory: string;
}
@Injectable({
  providedIn: 'root'
})

export class MediaService  {
  private http = inject(HttpClient);
  public router = inject(Router);
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

  updateMetaData(menu: string): Observable<any> {
    let menutype = new menuType;
    menutype.menuId = menu;
    return this.http.put<any>( '/updatedatabase/updateMetaData', JSON.stringify(menutype), this.httpOptions)
  }

  refreshMenu() {
    this.router.navigate([''])
      .then(() => {
        window.location.reload();
      });
  }
  // Get text Documents
  textFolder = signal<any>('');
  textFileName = signal<any>('');
  textDocResource = rxResource<any, any>({
    params: () => ({
      folder: this.textFolder(),
      fileName: this.textFileName()
    }),
    stream: ({ params }) => {
      if ((params.folder.length > 0) && (params.fileName.length > 0)) {
        return this.http.get(`${decodeURIComponent(params.folder)}${params.fileName}`, { responseType: 'text' })
      } else {
        return of('');
      }
    }

  }); 
  /**
   * Converts SRT subtitle text to WebVTT format:
   * - prefixes with the required "WEBVTT" header
   * - strips the numeric sequence-number lines SRT uses
   * - swaps the comma decimal separator in timestamps for a dot (00:00:01,000 -> 00:00:01.000)
   */
  private srtToVtt(srtText: string): string {
    return 'WEBVTT\n\n' + srtText
      .replace(/\r+/g, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .trim();
  }

  /**
   * Builds one VideoTrack per subtitle row the backend already found and
   * stored (MediaSubtitles table) - no existence-checking here, the backend
   * is the source of truth for which files exist. .vtt files are used
   * directly; .srt files are fetched once and converted to a WebVTT blob URL
   * in-memory, since the native <track> element only understands WebVTT.
   * A video can have zero, one, or many subtitle rows.
   */
  private buildCaptionTracks(fileFolder: string, subtitles: any[] | null | undefined): Observable<VideoTrack[]> {
    if (!subtitles || subtitles.length === 0) {
      return of([]);
    }

    const track$ = subtitles.map((sub: any): Observable<VideoTrack> => {
      const url = `${fileFolder}/closecaption/${sub.fileName}`;

      if (sub.fileName.toLowerCase().endsWith('.vtt')) {
        return of({ src: url, kind: 'subtitles', srclang: sub.language, label: sub.label, default: sub.isDefault } as VideoTrack);
      }

      // .srt -> fetch and convert to a WebVTT blob URL
      return this.http.get(url, { responseType: 'text' }).pipe(
        map(srtText => {
          const vtt = this.srtToVtt(srtText);
          const blob = new Blob([vtt], { type: 'text/vtt' });
          const blobUrl = URL.createObjectURL(blob);
          return { src: blobUrl, kind: 'subtitles', srclang: sub.language, label: sub.label, default: sub.isDefault } as VideoTrack;
        }),
        catchError(() => of(null as any))
      );
    });

    return forkJoin(track$).pipe(
      map(tracks => tracks.filter((t): t is VideoTrack => t !== null))
    );
  }

  folder = signal<any>('');
  menu = signal<any>('');
  fileFolder = signal<any>('');
  getMediaRecordRS = rxResource<any, any>({
    params: () =>
    ({
      folder: this.folder(),
      menu: this.menu(),
      fileFolder: this.fileFolder()
    }),
    stream: ({ params }) => {
      if ((params.folder.length > 0) && (params.menu.length > 0)) {
        return this.http.get<mediaMetaDatum[]>('/MediaMetaData/GetFilesByFolder?folder=' + params.folder + "&menu=" + params.menu)
          .pipe(
            switchMap((data: any) => {
              const items: any[] = data.mediaMetaData || [];
              if (items.length === 0) {
                return of([] as any[]);
              }

              const withCaptions$ = items.map((v: any, index: number) =>
                this.buildCaptionTracks(params.fileFolder, v.mediaSubtitles).pipe(
                  map(captions => ({
                    id: index + 1,
                    recordId: v.recordId,
                    title: v.title,
                    duration: v.duration,
                    url: params.fileFolder + "/" + v.title,
                    cover: '',
                    type: v.type,
                    captions
                  }))
                )
              );

              return forkJoin(withCaptions$);
            })
        )
      }
      else {
        return of([] as any[]);
      }
    }
  })

  getById(id: string) {
    return this.http.get<any>('/MediaMetaData/getById/' + `${id}`);
  }
}
