import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Rpm, RpmCoverItem } from '../interfaces/rpm.interface';
import { AudioItem } from '../../shared/audio-player/models/audio.model';
import { map } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { AppSettingsService } from '../../shared/services/app-settings.service';
@Injectable({
  providedIn: 'root'
})
export class RpmService {
  private http = inject(HttpClient);
  private appSettings = inject(AppSettingsService);
  coverFolder = signal<any>(this.appSettings.rpmCoverFolder); // signal
  
  getRpmMenuRS = rxResource<any, any>({
    params: () =>
    ({
      coverFolder: this.coverFolder()
    }),
    stream: ({ params }) => this.http.get<Rpm[]>('/Rpm/GetRpmMenu')
      .pipe(
        map((data) => {
          let result: RpmCoverItem[] = [];
          let seq: number = 1;
          for (let v of data) {
            result.push({
              id: seq++,
              recordId: v.recordId,
              coverUrl: params.coverFolder + '/' + v.title,
              folder: v.title.split('.')[0],
              artist: v.artist ?? null,
              audioType: v.audioType ?? null
            });
          }
          return result;
        })
      )
  })

  recordId = signal<any>(''); // signal
  rpmTrackUrl = signal<any>(''); // signal
  audioType = signal<string | null>(null); // signal - set alongside recordId/rpmTrackUrl in onPictureSelected
  getRpmTracksRS = rxResource<any, any>({
    params: () => {
      const recordId = this.recordId();
      const url = this.rpmTrackUrl();
      const audioType = this.audioType();

      // Skip the request if either value is empty/invalid
      if (!recordId || !url) {
        return undefined;
      }

      return { recordId, url, audioType };
    },
    stream: ({ params }) => this.http.get<any[]>('/Rpm/GetRpmTracks/' + params.recordId)
      .pipe(
        map((data) => {
          let result: AudioItem[] = [];
          let seq: number = 1;
          for (let v of data) {
            result.push({
              id: seq++,
              title: v.title,
              // durationSeconds is a real number of seconds now (see
              // RpmTrack.DurationSeconds); AudioItem.duration expects a
              // number, so this also fixes a pre-existing type mismatch
              // where a "hh:mm:ss" string used to be passed here.
              duration: v.durationSeconds ?? 0,
              trackNumber: v.trackNumber ?? null,
              artist: v.artist ?? null,
              url: params.url + '/' + v.title,
              // Falls back to 'audio/wav' only if the backend genuinely
              // has no AudioType for this album (shouldn't happen once
              // regen has run, but keeps old behavior as a safety net).
              type: params.audioType || 'audio/wav'
            });
          }
          return result;
        })
      )
  })
}

