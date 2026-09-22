import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MediaFolderTreeService } from '../../../shared/services/media-folder-tree.service';
import { MusicMaintenanceService } from '../../../shared/services/music-maintenance.service';
import { SnackService } from '../../../shared/services/snack.service';
import { MediaFolderTreeDto, MediaTrackDto } from '../../../models/media-folder-tree.model';
import { flattenTracks } from '../../../shared/utils/media-tree.utils';
import { SearchBoxComponent } from '../../../shared/search-box/search-box.component';
import { MusicMaintNodeComponent } from './music-maint-node/music-maint-node.component';
import { RenameNodeComponent, RenameNodeDialogData } from './rename-node/rename-node.component';

// Same two-pane shape as song-browser (artist list left, content right), but
// for maintenance instead of playback: no audio player, rename/delete
// buttons on the artist row and on every track row (not on intermediate
// album/disc folders). Unlike song-browser, the search box lives above the
// song tree in the right pane, not on the artist list - it's there to find a
// song buried several folders deep within the artist you're already looking
// at, not to filter the artist list itself. A match hides everything else in
// that artist's tree and shows only the matching song(s).
//
// Reused as-is for Movie Maintenance and Video Maintenance - the underlying
// MediaFolder/MediaTrack tree and the rename/delete endpoints are both
// menu-agnostic, so only the `menu` route data differs between the three
// sidebar entries (see admin-routing.module.ts). "Artist"/"song" wording
// below is generalized via groupLabel/itemLabel, which switch based on menu.
@Component({
  selector: 'app-music-maint',
  standalone: true,
  imports: [MusicMaintNodeComponent, SearchBoxComponent],
  templateUrl: './music-maint.component.html',
  styleUrl: './music-maint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicMaintComponent {
  private treeService = inject(MediaFolderTreeService);
  private musicMaintenanceService = inject(MusicMaintenanceService);
  private toastr = inject(SnackService);
  private _dialog = inject(MatDialog);
  private activatedRoute = inject(ActivatedRoute);

  // "musics", "movies" or "videos" - set via route data (see
  // admin-routing.module.ts), defaulting to "musics" so this still works if
  // ever used without route data (e.g. a unit test harness).
  private readonly menu = this.activatedRoute.snapshot.data['menu'] ?? 'musics';

  readonly groupLabel = this.menu === 'musics' ? 'Artist' : 'Group';
  readonly groupLabelPlural = this.menu === 'musics' ? 'Artists' : 'Groups';
  readonly itemLabel = this.menu === 'musics' ? 'song' : this.menu === 'movies' ? 'movie' : 'video';
  readonly itemLabelPlural = this.itemLabel + 's';

  constructor() {
    effect(() => this.treeService.menu.set(this.menu));
  }

  readonly tree = computed<MediaFolderTreeDto[]>(() => this.treeService.treeResource.value() ?? []);
  readonly isLoading = computed(() => this.treeService.treeResource.isLoading());

  readonly searchVal = signal('');
  readonly query = computed(() => this.searchVal().trim().toLowerCase());

  private readonly selectedArtistId = signal<string | null>(null);

  // Plain, unfiltered - the search box no longer touches this list, it only
  // scopes the selected artist's tree in the right pane (see rootTracks).
  readonly filteredArtists = computed<MediaFolderTreeDto[]>(() => this.tree());

  readonly selectedArtist = computed<MediaFolderTreeDto | null>(() => {
    const list = this.filteredArtists();
    if (!list.length) return null;
    const id = this.selectedArtistId();
    return (id && list.find(a => a.id === id)) || list[0];
  });

  // No search: show the artist's tree exactly as-is (folders for
  // navigation, direct tracks at this level - nested tracks come through
  // the recursive folder rendering, same as song-browser).
  // With a search: flatten the whole artist and keep only matching tracks,
  // dropping folder structure entirely - "show only the matching song(s),
  // hide the rest" per the agreed behaviour.
  readonly rootFolders = computed<MediaFolderTreeDto[]>(() => {
    if (this.query()) return [];
    return this.selectedArtist()?.folders ?? [];
  });

  readonly rootTracks = computed<MediaTrackDto[]>(() => {
    const artist = this.selectedArtist();
    if (!artist) return [];
    const q = this.query();
    if (!q) return artist.tracks;
    return flattenTracks(artist).filter(t => this.trackMatches(t, q));
  });

  private trackMatches(t: MediaTrackDto, q: string): boolean {
    return t.displayTitle.toLowerCase().includes(q) || t.fileName.toLowerCase().includes(q);
  }

  countTracks(folder: MediaFolderTreeDto): number {
    return flattenTracks(folder).length;
  }

  selectArtist(artist: MediaFolderTreeDto): void {
    this.selectedArtistId.set(artist.id);
    // Clear any in-progress search from the previously selected artist - it
    // scopes to one artist's tree, so carrying it over would silently filter
    // the newly selected artist without an obvious reason why.
    this.searchVal.set('');
  }

  onSearch(searchStr: string): void {
    this.searchVal.set(searchStr);
  }

  openRenameArtist(artist: MediaFolderTreeDto, event: Event): void {
    event.stopPropagation();
    this.openRenameDialog({ id: artist.id, currentName: artist.name, kind: 'folder' });
  }

  deleteArtist(artist: MediaFolderTreeDto, event: Event): void {
    event.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${artist.name}" and everything inside it? It will be moved to Trash, not permanently deleted.`
    );
    if (!confirmed) return;

    this.musicMaintenanceService.deleteFolder(artist.id).subscribe({
      next: (response: any) => {
        this.toastr.openSnackBar(response.message, 'Delete');
        if (this.selectedArtistId() === artist.id) {
          this.selectedArtistId.set(null);
        }
        this.treeService.treeResource.reload();
      },
      error: (err) => {
        this.toastr.openSnackBar(JSON.stringify(err.error), 'Delete');
      }
    });
  }

  onRenameTrack(track: MediaTrackDto): void {
    this.openRenameDialog({ id: track.id, currentName: track.fileName, kind: 'track' });
  }

  onDeleteTrack(track: MediaTrackDto): void {
    const confirmed = window.confirm(
      `Delete "${track.displayTitle}"? It will be moved to Trash, not permanently deleted.`
    );
    if (!confirmed) return;

    this.musicMaintenanceService.deleteTrack(track.id).subscribe({
      next: (response: any) => {
        this.toastr.openSnackBar(response.message, 'Delete');
        this.treeService.treeResource.reload();
      },
      error: (err) => {
        this.toastr.openSnackBar(JSON.stringify(err.error), 'Delete');
      }
    });
  }

  private openRenameDialog(data: RenameNodeDialogData): void {
    const dialogRef = this._dialog.open(RenameNodeComponent, {
      data,
      width: '50%',
      height: '50%'
    });

    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.treeService.treeResource.reload();
        }
      }
    });
  }
}
