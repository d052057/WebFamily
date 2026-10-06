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
  /** MediaDrive from appsettings.json (shown on the Rescan button). */
  mediaRoot: string;
  q: string | null;
  mode: ContentMode;
  page: number;
  totalPages: number;
  totalGroups: number;
  counts: GroupCounts;
  groups: DuplicateGroup[];
}

/** Live state of the background scan (polled while it runs). */
export interface ScanStatus {
  running: boolean;
  /** Idle | Starting | Scanning files | Hashing | Done | Cancelled | Failed */
  phase: string;
  filesSeen: number;
  hashDone: number;
  hashTotal: number;
  startedUtc: string | null;
  finishedUtc: string | null;
  message: string | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class DuplicatesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/duplicates';

  list(q: string, page: number, mode: ContentMode) {
    return this.http.get<DuplicatesPage>(this.base, { params: { q, page, mode } });
  }

  /** Starts a background scan. 409 means one is already running (body is the current status). */
  startScan() {
    return this.http.post<ScanStatus>(`${this.base}/scan`, {});
  }

  scanStatus() {
    return this.http.get<ScanStatus>(`${this.base}/scan/status`);
  }

  cancelScan() {
    return this.http.post<ScanStatus>(`${this.base}/scan/cancel`, {});
  }

  delete(id: number) {
    return this.http.delete<{ movedTo: string }>(`${this.base}/${id}`);
  }

  /** Blob fetch so it works with cookie auth or a bearer-token interceptor. */
  photo(id: number) {
    return this.http.get(`${this.base}/photo/${id}`, { responseType: 'blob' });
  }
}
