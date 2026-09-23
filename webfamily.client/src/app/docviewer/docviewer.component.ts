import { Component, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AppSettingsService } from '../shared/services/app-settings.service';
import { NgxPaginationModule } from 'ngx-pagination';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MediaFolderTreeService } from '../shared/services/media-folder-tree.service';
import { MediaFolderTreeDto } from '../models/media-folder-tree.model';
import { flattenTracks } from '../shared/utils/media-tree.utils';

// Lists one book group's documents (books/:folder). Built on the same
// MediaFolder/MediaTrack tree as song-browser/play-media, not the legacy
// MediaMetaData pipeline this used to read from - the nav bar's Documents
// dropdown already lists group names sourced from that same new tree, so
// this needed to match or a stale/missing legacy row would show up empty.
// PdfViewerComponent (the child route) is untouched - it builds the actual
// file path purely from route params, not from this table, so it works the
// same regardless of which system supplied the title.
@Component({
  selector: 'app-docviewer',
  imports: [NgxPaginationModule, RouterOutlet],
  templateUrl: './docviewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './docviewer.component.scss'
})
export class DocViewerComponent {
  processLoading: boolean = false;
  private appSettings = inject(AppSettingsService);
  readonly medias = this.appSettings.mediaBasePath;
  bookIndex: number = -1;
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private treeService = inject(MediaFolderTreeService);
  currentPage = signal(1);
  itemsPerPage = signal(10);

  rowSelected!: any;

  // e.g. "books" - the literal first URL segment, not a route param.
  private readonly menu = toSignal(
    this.activatedRoute.url.pipe(map(segments => segments[0]?.path ?? '')),
    { initialValue: this.activatedRoute.snapshot.url[0]?.path ?? '' }
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

  // Same {fileFolder} shape PdfViewerComponent (the child route) expects -
  // it builds the actual file path itself from route params alone, so this
  // stays a plain string built from the folder name, same as before.
  params = computed(() => {
    const folder = this.folderName();
    const fileFolder = `${this.medias}/${this.menu()}/${folder}/`;
    return { menu: this.menu(), folder, fileFolder };
  });

  dataSource = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    return flattenTracks(group).map(t => ({ title: t.fileName }));
  });

  selectedRow(row: any) {
    this.rowSelected = row;
    const localParams = this.params();
    if (localParams?.fileFolder) {
      const fileFolder = localParams.fileFolder;
      if (fileFolder) {
        let folder = encodeURIComponent(fileFolder);
        this.router.navigate([folder, row.title],
          {
            relativeTo: this.activatedRoute
          }
        )
      }
    }
  }
}
