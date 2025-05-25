import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

@Injectable({
  providedIn: 'root'
})
export class SvgIconService {

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.registerIcons();
  }
  registerIcons() {
    this.matIconRegistry.addSvgIcon(
      'kh',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/4x3/kh.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'us',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/4x3/us.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'logo',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/logo.svg'),
    { viewBox: '0 0 120 120' }
    );
  }
}
