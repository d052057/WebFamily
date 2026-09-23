import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { ActivatedRoute } from '@angular/router';
import { PhotoGallery } from '../shared/photo-gallery/photo-gallery';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MediaFolderTreeService } from '../shared/services/media-folder-tree.service';
import { MediaFolderTreeDto } from '../models/media-folder-tree.model';
import { flattenTracks } from '../shared/utils/media-tree.utils';

// Shows one photo group's pictures (photos/:folder). Built on the same
// MediaFolder/MediaTrack tree as song-browser/play-media, not the legacy
// MediaMetaData pipeline this used to read from - the nav bar's Photos
// dropdown already lists group names sourced from that same new tree, so
// this needed to match or a stale/missing legacy row would show up empty.
@Component({
  selector: 'app-photo',
  imports: [PhotoGallery],
  templateUrl: './photo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './photo.component.scss',
})
export class PhotoComponent {
  private activatedRoute = inject(ActivatedRoute);
  private appSettings = inject(AppSettingsService);
  private treeService = inject(MediaFolderTreeService);

  // e.g. "photos" - the literal first URL segment, not a route param.
  private readonly menu = toSignal(
    this.activatedRoute.url.pipe(map(segments => segments[0]?.path ?? '')),
    { initialValue: this.activatedRoute.snapshot.url[0]?.path ?? '' }
  );

  // The photo group name, from :folder.
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

  readonly isLoading = computed(() => this.treeService.treeResource.isLoading());

  // Each item carries a ready-to-use absolute url (built from the server's
  // already-correct relative path) plus a plain filename for the alt text -
  // app-photo-gallery prefers .url when present, see photo-gallery.html.
  readonly images = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    return flattenTracks(group).map(t => ({
      title: t.fileName,
      url: `${this.appSettings.mediaBasePath}/${t.url}`
    }));
  });

  readonly folderTitle = computed(() => this.selectedGroup()?.name ?? this.folderName());
}
