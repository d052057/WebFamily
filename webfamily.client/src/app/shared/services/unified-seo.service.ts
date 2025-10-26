// File: src/app/services/unified-seo.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface SEOData {
  title: string;
  description: string;
  keywords: string;
  image?: string;
  type?: string;
  languages?: { [key: string]: string };
  structuredData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedSeoService {
  private readonly baseUrl = '/api/seoadmin/public/metadata'; // Change to your actual URL
  private seoDataCache: any = null;

  constructor(
    private meta: Meta,
    private title: Title,
    private router: Router,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Load SEO data from JSON file (from your backend /data folder)
   */
  loadSeoData(): Observable<any> {
    if (this.seoDataCache) {
      return of(this.seoDataCache);
    }

    // Load from your backend server's /data folder
    return this.http.get<any>(this.baseUrl).pipe(
      map(data => {
        this.seoDataCache = data;
        /*console.log('SEO data loaded:', data);*/
        return data;
      }),
      catchError(error => {
        console.error('Error loading SEO data:', error);
        return of({});
      })
    );
  }

  /**
   * Update SEO by page key (from JSON)
   * @param pageKey - The key in seo-data.json (e.g., 'home', 'products')
   * @param dynamicData - Optional dynamic data to replace placeholders
   */
  updateSeoByKey(pageKey: string, dynamicData?: any): void {
    this.loadSeoData().subscribe(seoData => {
      const pageData = seoData[pageKey];

      if (!pageData) {
        console.warn(`SEO data not found for key: ${pageKey}`);
        return;
      }

      // Replace placeholders with dynamic data
      const processedData = this.replacePlaceholders(pageData, dynamicData);

      // Update all meta tags
      this.applyMetaTags(processedData);

      // Set hreflang if languages exist
      if (pageData.languages) {
        const languages = Object.keys(pageData.languages).map(code => ({
          code,
          url: `${this.baseUrl}${pageData.languages[code]}`
        }));
        this.setHreflangTags(languages);
      }

      // Add structured data if exists
      if (processedData.structuredData) {
        this.addStructuredData(processedData.structuredData);
      }
    });
  }

  /**
   * Apply all meta tags
   */
  private applyMetaTags(data: any): void {
    // Set title
    if (data.title) {
      this.title.setTitle(data.title);
    }

    // Set meta description
    if (data.description) {
      this.meta.updateTag({ name: 'description', content: data.description });
    }

    // Set keywords
    if (data.keywords) {
      this.meta.updateTag({ name: 'keywords', content: data.keywords });
    }

    // Open Graph tags
    if (data.title) {
      this.meta.updateTag({ property: 'og:title', content: data.title });
    }

    if (data.description) {
      this.meta.updateTag({ property: 'og:description', content: data.description });
    }

    if (data.image) {
      const imageUrl = data.image.startsWith('http')
        ? data.image
        : `${this.baseUrl}${data.image}`;
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
    }

    const pageUrl = `${this.baseUrl}${this.router.url}`;
    this.meta.updateTag({ property: 'og:url', content: pageUrl });

    if (data.type) {
      this.meta.updateTag({ property: 'og:type', content: data.type });
    }

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (data.title) {
      this.meta.updateTag({ name: 'twitter:title', content: data.title });
    }

    if (data.description) {
      this.meta.updateTag({ name: 'twitter:description', content: data.description });
    }

    if (data.image) {
      const imageUrl = data.image.startsWith('http')
        ? data.image
        : `${this.baseUrl}${data.image}`;
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    }

    // Update canonical URL
    this.updateCanonicalUrl(pageUrl);
  }

  /**
   * Replace placeholders in SEO data with dynamic values
   */
  private replacePlaceholders(data: any, dynamicData?: any): any {
    if (!dynamicData) return data;

    const processedData = JSON.parse(JSON.stringify(data)); // Deep clone

    const replace = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Replace {placeholder} with actual values
          obj[key] = obj[key].replace(/\{(\w+)\}/g, (match: string, placeholder: string) => {
            return dynamicData[placeholder] || match;
          });
        } else if (typeof obj[key] === 'object') {
          replace(obj[key]);
        }
      }
    };

    replace(processedData);
    return processedData;
  }

  /**
   * Update canonical URL
   */
  private updateCanonicalUrl(url: string): void {
    const canonicalUrl = url.split('?')[0]; // Remove query params

    const existingLink = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', canonicalUrl);
    } else {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      this.document.head.appendChild(link);
    }
  }

  /**
   * Set hreflang tags for multilingual support
   */
  private setHreflangTags(languages: { code: string; url: string }[]): void {
    // Remove existing hreflang tags
    const existingTags = this.document.querySelectorAll('link[hreflang]');
    existingTags.forEach(tag => tag.remove());

    // Add new hreflang tags
    languages.forEach(lang => {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang.code);
      link.setAttribute('href', lang.url);
      this.document.head.appendChild(link);
    });

    // Add x-default
    if (languages.length > 0) {
      const defaultLink = this.document.createElement('link');
      defaultLink.setAttribute('rel', 'alternate');
      defaultLink.setAttribute('hreflang', 'x-default');
      defaultLink.setAttribute('href', languages[0].url);
      this.document.head.appendChild(defaultLink);
    }
  }

  /**
   * Add structured data (JSON-LD)
   */
  private addStructuredData(data: any): void {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Only run in browser
    }

    // Remove existing structured data with same type
    const existingScripts = this.document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
      try {
        const scriptData = JSON.parse(script.textContent || '{}');
        if (scriptData['@type'] === data['@type']) {
          script.remove();
        }
      } catch (e) {
        script.remove();
      }
    });

    // Add new structured data
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  /**
   * Clear cache (useful when SEO data is updated)
   */
  clearCache(): void {
    this.seoDataCache = null;
  }
}
