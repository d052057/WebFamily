import { Component, ViewEncapsulation, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MediaFolderTreeService } from '../../../shared/services/media-folder-tree.service';
import { RpmService } from '../../../rpm/services/rpm.service';
import { catchError, concatMap, finalize, first, from, map, of, toArray } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-updatemenu',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './updatemenu.component.html',
  styleUrls: ['./updatemenu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class UpdatemenuComponent {
  folderTreeService = inject(MediaFolderTreeService);
  private rpmService = inject(RpmService);

  // The menus (musics, movies, ...) are the rows of the MediaMenu table - nothing in this screen
  // names them. One "Regenerate ... Folder Tree" button is drawn per menu.
  private menusResource = rxResource({ stream: () => this.folderTreeService.getMenus() });
  public menus = computed(() => this.menusResource.value() ?? []);
  public menusError = computed(() => !!this.menusResource.error());
  public initLabel = computed(() =>
    this.menus().length > 0
      ? `Initial Media Database (${this.menus().map(m => this.titleOf(m)).join('/')})`
      : 'Initial Media Database');

  public rpmUpdateStatus = signal<any>([]);
  public initDatabaseStatus = signal<any>([]);
  public rpmsUpdate = signal(false);
  public initDatabaseUpdate = signal(false);

  // Per-menu state, keyed by the menu name.
  private scanning = signal<Record<string, boolean>>({});
  private scanStatus = signal<Record<string, string[]>>({});

  isScanning(menu: string): boolean {
    return !!this.scanning()[menu];
  }

  statusOf(menu: string): string[] {
    return this.scanStatus()[menu] ?? [];
  }

  // "musics" -> "Musics"
  titleOf(menu: string): string {
    return menu ? menu.charAt(0).toUpperCase() + menu.slice(1) : menu;
  }

  private setScanning(menu: string, value: boolean): void {
    this.scanning.update(m => ({ ...m, [menu]: value }));
  }

  private setStatus(menu: string, status: string[]): void {
    this.scanStatus.update(m => ({ ...m, [menu]: status }));
  }

  // Regenerates MediaFolder/MediaTrack from disk for one menu.
  onScanFolderTree(menu: string) {
    this.setScanning(menu, true);
    this.setStatus(menu, ['Processing...']);
    this.folderTreeService.scanFolderTree(menu)
      .pipe(first())
      .pipe(finalize(() => this.setScanning(menu, false)))
      .subscribe({
        next: (data: string[]) => { this.setStatus(menu, data); },
        error: (err) => { this.setStatus(menu, [JSON.stringify(err.error ?? err.message ?? err)]); }
      });
  }

  // Clears and rebuilds MediaFolder/MediaTrack for every menu in the MediaMenu table in one click -
  // each is scanFolderTree's own existing per-menu clear-then-rebuild (see
  // MediaFolderScanService.ScanAsync), just run one after another (concatMap, not parallel) so they
  // aren't all hammering the database's MediaFolder/MediaTrack tables for different menus at once.
  onInitDatabaseUpdate() {
    this.initDatabaseUpdate.set(true);
    this.initDatabaseStatus.set(['Processing...']);

    const menus = this.menus();

    from(menus).pipe(
      concatMap(menu =>
        this.folderTreeService.scanFolderTree(menu).pipe(
          map(result => ({ menu, result })),
          catchError(err => of({ menu, result: [`Error: ${JSON.stringify(err.error ?? err.message ?? err)}`] }))
        )
      ),
      toArray(),
      finalize(() => this.initDatabaseUpdate.set(false))
    ).subscribe(results => {
      const combined = results.flatMap(({ menu, result }) => [`--- ${menu} ---`, ...result]);
      this.initDatabaseStatus.set(combined);
    });
  }

  // Wipes and rebuilds Rpm/RpmTrack from disk - native C# regen (see
  // RpmScanService), no Python involved. artist-lookup.json is produced
  // separately by WebFamily-tools/itunes-artist-lookup-converter; this just
  // reads whatever that script last wrote there.
  onRpmUpdate() {
    this.rpmsUpdate.set(true);
    this.rpmUpdateStatus.set(['Processing...']);
    this.rpmService.regenerate()
      .pipe(first())
      .pipe(finalize(() => this.rpmsUpdate.set(false)))
      .subscribe({
        next: (data: string[]) => { this.rpmUpdateStatus.set(data); },
        error: (err) => { this.rpmUpdateStatus.set([JSON.stringify(err.error ?? err.message ?? err)]); }
      });
  }
}
