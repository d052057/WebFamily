import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { VideoViewerComponent } from './video-viewer/video-viewer.component';
import { VideoSource } from './models/video.model';

import { AppSettingsService } from '../shared/services/app-settings.service';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MediaFolderTreeService } from '../shared/services/media-folder-tree.service';
import { MediaFolderTreeDto } from '../models/media-folder-tree.model';
import { flattenTracks } from '../shared/utils/media-tree.utils';
import { MediaListComponent, MediaListItem } from '../shared/media-list/media-list.component';

// Frame-by-frame viewer for one movie/video group (frames/:menu/:folder).
// Built on the same MediaFolder/MediaTrack tree as song-browser/play-media,
// not the legacy MediaMetaData pipeline this used to read from - the nav
// bar's Frames dropdown already lists group names sourced from that same
// new tree, so this needed to match or a stale/missing legacy row would
// show up empty.
//
// :menu is an explicit route param, not inferred from the URL like
// play-media does - the literal first URL segment here is "frames", which
// isn't a real menu name, unlike movies/:folder or videos/:folder where the
// first segment IS the menu. This is also what lets Frames work for both
// movies and videos, not just movies.
//
// The movie/video picker list is the shared song-list-style component, same
// as Movies/Videos/Documents.
@Component({
  selector: 'app-video-view-frame',
  imports: [VideoViewerComponent, MediaListComponent],
  templateUrl: './video-view-frame.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './video-view-frame.component.scss'
})
export class VideoViewFrameComponent {
  private activatedRoute = inject(ActivatedRoute);
  private appSettings = inject(AppSettingsService);
  private treeService = inject(MediaFolderTreeService);
  selectedVideo: VideoSource | null = null;

  // "movies" or "videos" - the explicit :menu route param.
  private readonly menu = toSignal(
    this.activatedRoute.paramMap.pipe(map(p => p.get('menu') ?? '')),
    { initialValue: this.activatedRoute.snapshot.paramMap.get('menu') ?? '' }
  );

  private readonly folderName = toSignal(
    this.activatedRoute.paramMap.pipe(map(p => p.get('folder') ?? '')),
    { initialValue: this.activatedRoute.snapshot.paramMap.get('folder') ?? '' }
  );

  constructor() {
    effect(() => this.treeService.menu.set(this.menu()));
  }

  private readonly tree = computed<MediaFolderTreeDto[]>(() => this.treeService.treeResource.value() ?? []);

  private readonly selectedGroup = computed<MediaFolderTreeDto | null>(() => {
    const name = this.folderName().toLowerCase();
    if (!name) return null;
    return this.tree().find(g => g.name.toLowerCase() === name) ?? null;
  });

  videoSources = computed<VideoSource[]>(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    return flattenTracks(group).map((t, index) => new VideoSource({
      title: t.displayTitle,
      src: `${this.appSettings.mediaBasePath}/${t.url}`,
      type: t.type ?? ''
    }, index + 1));
  });

  // Matches the nav bar's own icon choice for each menu.
  readonly itemIcon = computed(() => this.menu() === 'movies' ? 'bi-camera-reels' : 'bi-camera-video');

  listItems = computed<MediaListItem[]>(() =>
    this.videoSources().map(v => ({ id: v.id, title: v.title }))
  );

  selectVideo(item: MediaListItem) {
    this.selectedVideo = this.videoSources().find(v => v.id === item.id) ?? null;
  }
}
