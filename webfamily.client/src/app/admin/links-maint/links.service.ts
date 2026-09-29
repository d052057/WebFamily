import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { MenuItem } from '../../models/menu-item.model';
import { MenuService } from '../../shared/services/menu.service';

// Admin CRUD over Data/links.json (see LinksController) - same shape as
// TodoService, different backend. Each mutation returns the server's fresh
// list (ids are renumbered on every save, so the list is what matters, not
// the single item), and the nav bar's Links dropdown is refreshed right
// after so it doesn't show stale entries until the next page load.
@Injectable({
  providedIn: 'root'
})
export class LinksService {
  private http = inject(HttpClient);
  private menuService = inject(MenuService);

  linksDataRS = rxResource<any, any>({
    stream: () => this.http.get<MenuItem[]>('/api/Links/GetLinks')
  });

  addLink(link: Pick<MenuItem, 'title' | 'param'>): Observable<MenuItem[]> {
    return this.http.post<MenuItem[]>('/api/Links/AddLink', link)
      .pipe(tap(() => this.refreshNav()));
  }

  updateLink(link: MenuItem): Observable<MenuItem[]> {
    return this.http.put<MenuItem[]>('/api/Links/UpdateLink', link)
      .pipe(tap(() => this.refreshNav()));
  }

  deleteLink(id: number): Observable<MenuItem[]> {
    return this.http.delete<MenuItem[]>('/api/Links/DeleteLink/' + id)
      .pipe(tap(() => this.refreshNav()));
  }

  private refreshNav(): void {
    void this.menuService.refreshMenu('links');
  }
}

// The server answers failures with a plain-text reason (validation, a
// duplicate title, or "check write permission on the Data folder"), so show
// that rather than a stringified HttpErrorResponse.
export function linksErrorText(err: any): string {
  if (typeof err?.error === 'string' && err.error) return err.error;
  return err?.error?.title ?? err?.message ?? 'Unexpected error';
}
