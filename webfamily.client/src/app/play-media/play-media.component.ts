import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { MediaFolderTreeService } from '../shared/services/media-folder-tree.service';
import { MediaFolderTreeDto } from '../models/media-folder-tree.model';
import { flattenTracks, toVideoItems } from '../shared/utils/media-tree.utils';

// Plays one movie/video group (e.g. movies/:folder, videos/:folder). The
// menu ("movies" or "videos") comes from the URL's own first path segment -
// same trick the legacy version of this component already used - so this one
// component serves both routes without needing to know which in advance.
// Built on the same MediaFolder/MediaTrack tree as song-browser and Music
// Maintenance, not the legacy MediaMetaData pipeline.
@Component({
  selector: 'app-play-media',
  imports: [VideoPlayerComponent],
  templateUrl: './play-media.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './play-media.component.scss'
})
export class PlayMediaComponent {
  private activatedRoute = inject(ActivatedRoute);
  private appSettings = inject(AppSettingsService);
  private treeService = inject(MediaFolderTreeService);

  // e.g. "movies" or "videos" - the literal first URL segment, not a route param.
  private readonly menu = toSignal(
    this.activatedRoute.url.pipe(map(segments => segments[0]?.path ?? '')),
    { initialValue: this.activatedRoute.snapshot.url[0]?.path ?? '' }
  );

  // The movie/video group name, from :folder.
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

  readonly videoSources = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    return toVideoItems(flattenTracks(group), this.appSettings.mediaBasePath);
  });
}
