// Mirrors WebFamily.Server.DTOs.Media.MediaFolderTreeDto / MediaTrackDto exactly.

export interface MediaTrackDto {
  id: string;
  fileName: string;
  // Falls back to the file name server-side when the ID3 tag had no title -
  // this is always safe to show, never the literal "<unknown>".
  displayTitle: string;
  artist?: string | null;
  album?: string | null;
  trackNumber?: number | null;
  duration?: string | null; // "hh:mm:ss", or null if unreadable
  // MIME type (e.g. "video/mp4") - needed for a <video>/<audio> element's
  // <source type="">, mainly relevant for video playback.
  type?: string | null;
  // Relative to the media root (e.g. "songs/Elena Vasquez/Copper Skies/Copper Skies.mp3") -
  // prepend AppSettingsService.mediaBasePath before use.
  url: string;
}

export interface MediaFolderTreeDto {
  id: string;
  name: string;
  // Relative to the media root, same convention as MediaTrackDto.url. Null if
  // no cover.jpg/folder.jpg/album.jpg was found in this folder.
  coverImagePath?: string | null;
  folders: MediaFolderTreeDto[];
  tracks: MediaTrackDto[];
}
