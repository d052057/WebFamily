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

@Component({
  selector: 'app-song-browser',
  standalone: true,
  imports: [AudioPlayerComponent, FolderNodeComponent],
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
  // bookmarkable/shareable - not just component-local state.
  private readonly selectedIdFromQuery = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('artist'))),
    { initialValue: null as string | null }
  );

  constructor() {
    effect(() => this.treeService.menu.set(this.menu()));
  }

  readonly tree = computed<MediaFolderTreeDto[]>(() => this.treeService.treeResource.value() ?? []);
  readonly isLoading = computed(() => this.treeService.treeResource.isLoading());

  readonly selectedArtist = computed<MediaFolderTreeDto | null>(() => {
    const list = this.tree();
    if (!list.length) return null;
    const id = this.selectedIdFromQuery();
    return list.find(a => a.id === id) ?? list[0];
  });

  // Every track under the selected artist, however many albums/discs deep -
  // this is what actually gets handed to the audio player as one playlist.
  readonly playlistTracks = computed<MediaTrackDto[]>(() => {
    const artist = this.selectedArtist();
    return artist ? flattenTracks(artist) : [];
  });

  readonly audioItems = computed<AudioItem[]>(() =>
    toAudioItems(this.playlistTracks(), this.appSettings.mediaBasePath)
  );

  // Relative url of whatever's currently loaded, so the folder tree can
  // highlight the right row at whatever depth it lives.
  readonly currentTrackUrl = signal<string | null>(null);

  selectArtist(folder: MediaFolderTreeDto): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { artist: folder.id },
      queryParamsHandling: 'merge'
    });
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
