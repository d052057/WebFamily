import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface PublicClientSettings {
  googleClientId: string;
  googleMapsApiKey: string;
  youtubeApiKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private http = inject(HttpClient);
  private settings: PublicClientSettings = { googleClientId: '', googleMapsApiKey: '', youtubeApiKey: '' };

  get googleClientId(): string {
    return this.settings.googleClientId;
  }

  get googleMapsApiKey(): string {
    return this.settings.googleMapsApiKey;
  }

  get youtubeApiKey(): string {
    return this.settings.youtubeApiKey;
  }

  // Called once via provideAppInitializer in app.config.ts, before the
  // app finishes bootstrapping, so components can rely on
  // this.appSettings.googleClientId being populated by the time they render.
  load(): Promise<void> {
    return firstValueFrom(this.http.get<PublicClientSettings>('/api/settings/public'))
      .then(result => {
        this.settings = result;
      })
      .catch(error => {
        console.error('Failed to load public app settings from the server', error);
      });
  }
}
