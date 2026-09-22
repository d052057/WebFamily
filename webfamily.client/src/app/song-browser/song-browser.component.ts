import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AudioPlayerComponent } from '../shared/audio-player/audio-player.component';
import { AudioItem } from '../shared/audio-player/models/audio.model';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { MediaFolderTreeService } from '../shared/services/media-folder-tree.service';
import { MediaFolderTreeDto, MediaTrackDto } from '../models/media-folder-tree.model';
import { flattenTracks, toAudioItems } from '../shared/utils/media-tree.utils';
import { FolderNodeComponent } from '../folder-node/folder-node.component';
import { SearchBoxComponent } from '../shared/search-box/search-box.component';

@Component({
  selector: 'app-song-browser',
  standalone: true,
  imports: [AudioPlayerComponent, FolderNodeComponent, SearchBoxComponent],
  templateUrl: './song-browser.component.html',
  styleUrl: './song-browser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongBrowserComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appSettings = inject(AppSettingsService);
  private treeService = inject(MediaFolderTreeService);

  private readonly player = viewChild(AudioPlayerComponent);

  // "songs", "musics", etc. - which library this route is browsing.
  readonly menu = toSignal(
    this.route.paramMap.pipe(map(p => p.get('menu') ?? '')),
    { initialValue: '' }
  );

  // Which top-level folder (artist) is selected, kept in the URL so it's
  // bookmarkable/shareable - not just component-local state. Supports two
  // ways in: ?artist=<guid> (used by in-page nav-pills clicks - fine there,
  // since the tree and its GUIDs are freshly fetched together in that same
  // session) and ?artistName=<name> (for permanent links like the nav bar -
  // GUIDs are reassigned on every rescan, so a hardcoded GUID would break the
  // next time the library gets regenerated; a name survives that).
  private readonly selectedIdFromQuery = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('artist'))),
    { initialValue: null as string | null }
  );
  private readonly selectedNameFromQuery = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('artistName'))),
    { initialValue: null as string | null }
  );

  constructor() {
    effect(() => this.treeService.menu.set(this.menu()));
  }

  readonly tree = computed<MediaFolderTreeDto[]>(() => this.treeService.treeResource.value() ?? []);
  readonly isLoading = computed(() => this.treeService.treeResource.isLoading());

  // Filters nothing directly - it scopes the selected artist's tree below
  // (see rootTracks/rootFolders), not the artist nav list. Text comes from
  // the shared SearchBoxComponent (typed or dictated) via its (searchChange)
  // output.
  readonly searchVal = signal('');
  readonly query = computed(() => this.searchVal().trim().toLowerCase());

  // Plain, unfiltered - the search box no longer touches the artist list.
  readonly filteredArtists = computed<MediaFolderTreeDto[]>(() => this.tree());

  readonly selectedArtist = computed<MediaFolderTreeDto | null>(() => {
    const list = this.tree();
    if (!list.length) return null;

    const id = this.selectedIdFromQuery();
    if (id) {
      const byId = list.find(a => a.id === id);
      if (byId) return byId;
    }

    const name = this.selectedNameFromQuery();
    if (name) {
      const byName = list.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (byName) return byName;
    }

    return list[0];
  });

  // Every track under the selected artist, however many albums/discs deep -
  // this is what actually gets handed to the audio player as one playlist.
  // Always the full artist, regardless of any search below - search only
  // narrows what's displayed for browsing, not what's queued to play.
  readonly playlistTracks = computed<MediaTrackDto[]>(() => {
    const artist = this.selectedArtist();
    return artist ? flattenTracks(artist) : [];
  });

  readonly audioItems = computed<AudioItem[]>(() =>
    toAudioItems(this.playlistTracks(), this.appSettings.mediaBasePath)
  );

  // What's rendered in the folder tree below, for browsing/finding a song.
  // No search: the artist's tree as-is (folders for navigation, direct
  // tracks at this level - nested tracks come through folder-node's own
  // recursion). With a search: flatten the whole artist and keep only
  // matching tracks, dropping folder structure entirely, so a song several
  // albums deep surfaces immediately.
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

  // Relative url of whatever's currently loaded, so the folder tree can
  // highlight the right row at whatever depth it lives.
  readonly currentTrackUrl = signal<string | null>(null);

  selectArtist(folder: MediaFolderTreeDto): void {
    // Clear any in-progress search from the previously selected artist - it
    // scopes to one artist's tree, so carrying it over would silently filter
    // the newly selected artist without an obvious reason why.
    this.searchVal.set('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { artist: folder.id },
      queryParamsHandling: 'merge'
    });
  }

  onSearch(searchStr: string): void {
    this.searchVal.set(searchStr);
  }

  onTrackSelected(track: MediaTrackDto): void {
    const index = this.playlistTracks().findIndex(t => t.id === track.id);
    if (index >= 0) {
      this.player()?.playTrack(index);
    }
  }

  onTrackChange(item: AudioItem): void {
    const prefix = `${this.appSettings.mediaBasePath}/`;
    this.currentTrackUrl.set(item?.url?.startsWith(prefix) ? item.url.slice(prefix.length) : item?.url ?? null);
  }

  countTracks(folder: MediaFolderTreeDto): number {
    return flattenTracks(folder).length;
  }
}
