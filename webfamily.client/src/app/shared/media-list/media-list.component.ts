import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

export interface MediaListItem {
  id: string | number;
  title: string;
  subtitle?: string | null;
  duration?: string | null; // pre-formatted display string, e.g. "3:45" - this component does no formatting itself
}

// The "song-list" look (icon + title, optional subtitle/duration, active-row
// highlight) factored out of folder-node so it can be reused anywhere else
// that shows a flat list of playable/openable items - currently: the movie
// and video playlists, the Frames movie picker, and the Documents list.
// Deliberately item-type-agnostic: the icon and whether duration is shown at
// all are both inputs, set by the caller to match what it's actually
// listing.
@Component({
  selector: 'app-media-list',
  standalone: true,
  templateUrl: './media-list.component.html',
  styleUrl: './media-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaListComponent {
  @Input() items: MediaListItem[] = [];
  // Bootstrap Icons class, e.g. "bi-music-note-beamed", "bi-camera-reels",
  // "bi-file-earmark-pdf". One icon for the whole list - callers with mixed
  // file types would need a richer input, but nothing currently needs that.
  @Input() icon = 'bi-file-earmark';
  @Input() showDuration = true;
  @Input() selectedId: string | number | null = null;
  @Input() emptyMessage = 'Nothing here yet';

  @Output() select = new EventEmitter<MediaListItem>();

  trackById(_index: number, item: MediaListItem): string | number {
    return item.id;
  }
}
