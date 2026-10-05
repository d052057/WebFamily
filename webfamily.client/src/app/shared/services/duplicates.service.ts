import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

/** Which same-size groups to show. */
export type ContentMode = 'all' | 'same' | 'different' | 'pending';
/** Per-group result of comparing hashes. */
export type ContentStatus = 'identical' | 'partial' | 'different' | 'pending';

export interface MediaFile {
  id: number;
  fileName: string;
  fullPath: string;
  sha256: string | null;
  isPhoto: boolean;
  lastWriteUtc: string;
}

export interface DuplicateGroup {
  sizeBytes: number;
  contentStatus: ContentStatus;
  files: MediaFile[];
}

export interface GroupCounts {
  all: number;
  same: number;
  different: number;
  pending: number;
}

export interface DuplicatesPage {
  q: string | null;
  mode: ContentMode;
  page: number;
  totalPages: number;
  totalGroups: number;
  counts: GroupCounts;
  groups: DuplicateGroup[];
}

export interface ScanResult {
  seen: number;
  added: number;
  missing: number;
  hashed: number;
}

@Injectable({ providedIn: 'root' })
export class DuplicatesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/duplicates';

  list(q: string, page: number, mode: ContentMode) {
    return this.http.get<DuplicatesPage>(this.base, { params: { q, page, mode } });
  }

  scan() {
    return this.http.post<ScanResult>(`${this.base}/scan`, {});
  }

  delete(id: number) {
    return this.http.delete<{ movedTo: string }>(`${this.base}/${id}`);
  }

  /** Blob fetch so it works with cookie auth or a bearer-token interceptor. */
  photo(id: number) {
    return this.http.get(`${this.base}/photo/${id}`, { responseType: 'blob' });
  }
}
