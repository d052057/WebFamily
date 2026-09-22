import { AudioItem } from '../audio-player/models/audio.model';
import { VideoSource } from '../video-player/models/video.model';
import { MediaFolderTreeDto, MediaTrackDto } from '../../models/media-folder-tree.model';

/**
 * Walks a folder node and every descendant folder, collecting tracks in tree
 * order (this folder's own tracks first, then each child folder's, depth
 * first). Works identically whether the folder holds songs directly or is
 * several albums/discs deep - the caller never needs to know which.
 */
export function flattenTracks(folder: MediaFolderTreeDto): MediaTrackDto[] {
  return [
    ...folder.tracks,
    ...folder.folders.flatMap(flattenTracks)
  ];
}

/** "01:23:45" -> 5025. Returns 0 for null/unparsable input. */
export function parseDurationToSeconds(duration: string | null | undefined): number {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length !== 3 || parts.some(p => Number.isNaN(p))) return 0;
  const [hours, minutes, seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts server track DTOs into the shape app-audio-player expects.
 * mediaBasePath is prepended to each track's (root-relative) url.
 */
export function toAudioItems(tracks: MediaTrackDto[], mediaBasePath: string): AudioItem[] {
  return tracks.map((t, index) => ({
    id: index + 1,
    url: `${mediaBasePath}/${t.url}`,
    title: t.displayTitle,
    duration: parseDurationToSeconds(t.duration),
    trackNumber: t.trackNumber ?? null,
    artist: t.artist ?? null
  }));
}

/**
 * Converts server track DTOs into the shape app-video-player expects.
 * mediaBasePath is prepended to each track's (root-relative) url.
 */
export function toVideoItems(tracks: MediaTrackDto[], mediaBasePath: string): VideoSource[] {
  return tracks.map((t, index) => new VideoSource({
    title: t.displayTitle,
    src: `${mediaBasePath}/${t.url}`,
    type: t.type ?? '',
    duration: parseDurationToSeconds(t.duration)
  }, index + 1));
}
