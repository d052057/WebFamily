import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
// album/disc folders), and the single search box - living in the artist
// list pane, same spot as song-browser - matches against BOTH artist names
// and song names. When a song match drives the result, the right pane shows
// only the matching song(s) for that artist, not the full tree.
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

  constructor() {
    // Fixed to the "musics" menu - this screen is Music Maintenance only.
    effect(() => this.treeService.menu.set('musics'));
  }

  readonly tree = computed<MediaFolderTreeDto[]>(() => this.treeService.treeResource.value() ?? []);
  readonly isLoading = computed(() => this.treeService.treeResource.isLoading());

  readonly searchVal = signal('');
  readonly query = computed(() => this.searchVal().trim().toLowerCase());

  private readonly selectedArtistId = signal<string | null>(null);

  // An artist matches if its own name matches, OR any song anywhere in its
  // tree matches - so typing a song title surfaces the artist that owns it.
  readonly filteredArtists = computed<MediaFolderTreeDto[]>(() => {
    const q = this.query();
    const list = this.tree();
    if (!q) return list;
    return list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      flattenTracks(a).some(t => this.trackMatches(t, q))
    );
  });

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
