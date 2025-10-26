// ============================================================================
// ANGULAR SIDE
// ============================================================================

// -----------------------------
// 1. SEO Admin Service
// -----------------------------
// File: src/app/services/seo-admin.service.ts

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SeoData {
  title: string;
  description: string;
  keywords: string;
  image?: string;
  type?: string;
  languages?: { [key: string]: string };
  structuredData?: any;
}

export interface SeoUpdateRequest {
  key: string;
  data: SeoData;
}

export interface SeoDeleteRequest {
  key: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoAdminService {
  private apiUrl = '/api/seoadmin'; // Your .NET backend URL
  private http = inject(HttpClient);
  constructor() { }

  /**
   * Get all SEO data
   */
  getAllSeoData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all`);
  }

  /**
   * Get SEO data by key
   */
  getSeoDataByKey(key: string): Observable<SeoData> {
    return this.http.get<SeoData>(`${this.apiUrl}/${key}`);
  }

  /**
   * Create new SEO entry
   */
  createSeoData(key: string, data: SeoData): Observable<any> {
    const request: SeoUpdateRequest = { key, data };
    return this.http.post(`${this.apiUrl}/create`, request);
  }

  /**
   * Update existing SEO entry
   */
  updateSeoData(key: string, data: SeoData): Observable<any> {
    const request: SeoUpdateRequest = { key, data };
    return this.http.put(`${this.apiUrl}/update`, request);
  }

  /**
   * Delete SEO entry
   */
  deleteSeoData(key: string): Observable<any> {
    const request: SeoDeleteRequest = { key };
    return this.http.request('delete', `${this.apiUrl}/delete`, { body: request });
  }

  /**
   * Backup SEO data
   */
  backupSeoData(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/backup`, { responseType: 'blob' });
  }
}
