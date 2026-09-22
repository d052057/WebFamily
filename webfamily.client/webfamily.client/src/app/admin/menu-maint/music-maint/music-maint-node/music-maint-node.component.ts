import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MediaFolderTreeDto, MediaTrackDto } from '../../../../models/media-folder-tree.model';

// Same recursive shape as FolderNodeComponent (folders as an accordion,
// direct tracks as a list-group, recursing into itself for children) but for
// maintenance rather than playback: no click-to-play, and rename/delete
// buttons live only on track rows - album/disc folders in between are pure
// navigation, per the "only artist + song level" decision (the artist itself
// gets its rename/delete buttons in the parent artist-list row, not here).
@Component({
  selector: 'app-music-maint-node',
  standalone: true,
  imports: [MusicMaintNodeComponent, MatIconModule],
  templateUrl: './music-maint-node.component.html',
  styleUrl: './music-maint-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusicMaintNodeComponent {
  @Input() folders: MediaFolderTreeDto[] = [];
  @Input() tracks: MediaTrackDto[] = [];

  // Unique id for this level's <div class="accordion"> - same purpose as in
  // FolderNodeComponent, so Bootstrap's data-bs-parent scoping doesn't
  // collide between sibling branches.
  @Input() groupId = 'root';

  // Bubbles all the way up to MusicMaintComponent, whichever depth the click happened at.
  @Output() renameTrack = new EventEmitter<MediaTrackDto>();
  @Output() deleteTrack = new EventEmitter<MediaTrackDto>();

  trackByFolderId(_index: number, folder: MediaFolderTreeDto): string {
    return folder.id;
  }

  trackByTrackId(_index: number, track: MediaTrackDto): string {
    return track.id;
  }
}
