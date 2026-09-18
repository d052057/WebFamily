import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MediaFolderTreeDto, MediaTrackDto } from '../models/media-folder-tree.model';

// Renders the CHILDREN of one folder: its direct tracks as a list-group, and
// its sub-folders as an accordion. Each accordion item recurses into this
// same component for its own children, so the same template handles an
// artist with songs directly, one with albums, or albums with discs -
// however deep a given branch happens to go, with no per-depth template.
@Component({
  selector: 'app-folder-node',
  standalone: true,
  imports: [FolderNodeComponent],
  templateUrl: './folder-node.component.html',
  styleUrl: './folder-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderNodeComponent {
  @Input() folders: MediaFolderTreeDto[] = [];
  @Input() tracks: MediaTrackDto[] = [];

  // Unique id for this level's <div class="accordion">, so Bootstrap's
  // data-bs-parent scoping (only one open item per level) doesn't collide
  // with a sibling branch's accordion elsewhere in the tree. The parent
  // folder's own guid is always unique, so no index bookkeeping is needed.
  @Input() groupId = 'root';

  // Relative url (matches MediaTrackDto.url, no mediaBasePath prefix) of
  // whichever track is currently loaded in the player - used to highlight
  // the matching row, at whatever depth it happens to live.
  @Input() playingUrl: string | null = null;

  // Bubbles all the way up to SongBrowserComponent, whichever depth the click happened at.
  @Output() trackSelected = new EventEmitter<MediaTrackDto>();

  trackByFolderId(_index: number, folder: MediaFolderTreeDto): string {
    return folder.id;
  }

  trackByTrackId(_index: number, track: MediaTrackDto): string {
    return track.id;
  }
}
