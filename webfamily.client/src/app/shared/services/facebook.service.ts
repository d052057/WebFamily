import { Injectable, inject } from '@angular/core';
import { AppSettingsService } from './app-settings.service';

declare const FB: any;

@Injectable({
  providedIn: 'root'
})
export class FacebookService {
  private appSettings = inject(AppSettingsService);
  private sdkLoaded = false;

  loadSdk(): Promise<void> {
    if (this.sdkLoaded) {
      return Promise.resolve();
    }

    return this.appSettings.load().then(() => new Promise<void>((resolve, reject) => {
      // FB requires this global callback to be set up BEFORE sdk.js loads.
      // Putting appId in the script URL's hash alone (the old approach)
      // does not properly initialize the SDK for FB.login() calls.
      (window as any).fbAsyncInit = () => {
        FB.init({
          appId: this.appSettings.facebookAppId,
          cookie: true,
          xfbml: true,
          version: 'v20.0'
        });
        this.sdkLoaded = true;
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    }));
  }

}
