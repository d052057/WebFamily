import { Service, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Service()
export class Urlbase {
  private document = inject(DOCUMENT);

  baseUrl(): string {
    const path = this.document.location.pathname;

    // Extract first segment: '', 'FrontPath', 'TenantA', etc.
    const firstSegment = path.split('/')[1];

    // If empty → dev mode or root deployment
    return firstSegment || '';
  }
}
