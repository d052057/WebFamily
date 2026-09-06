import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface PublicClientSettings {
  googleClientId: string;
  googleMapsApiKey: string;
  youtubeApiKey: string;
  facebookAppId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private http = inject(HttpClient);
  private settings: PublicClientSettings = { googleClientId: '', googleMapsApiKey: '', youtubeApiKey: '', facebookAppId: '' };

  get googleClientId(): string {
    return this.settings.googleClientId;
  }

  get googleMapsApiKey(): string {
    return this.settings.googleMapsApiKey;
  }

  get youtubeApiKey(): string {
    return this.settings.youtubeApiKey;
  }

  get facebookAppId(): string {
    return this.settings.facebookAppId;
  }

  private loadPromise: Promise<void> | null = null;

  // Called via provideAppInitializer in app.config.ts, before the app
  // finishes bootstrapping, so components can rely on these getters being
  // populated by the time they render. Safe to call more than once (e.g.
  // FacebookService also awaits this to guarantee ordering) - only the
  // first call actually hits the network, everyone else shares that result.
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = firstValueFrom(this.http.get<PublicClientSettings>('/api/settings/public'))
        .then(result => {
          this.settings = result;
        })
        .catch(error => {
          console.error('Failed to load public app settings from the server', error);
        });
    }
    return this.loadPromise;
  }
}
