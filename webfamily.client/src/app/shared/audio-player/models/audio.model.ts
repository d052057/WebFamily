export interface AudioItem {
  id: number,
  url: string;
  title?: string;
  duration: number;
  cover?: string;
  type?: string;
  /** 1-based track order, parsed server-side from the file name. Null/undefined if unparsed. */
  trackNumber?: number | null;
  /** Per-track artist (falls back to the album artist when absent). */
  artist?: string | null;
}
// Types for better type safety
export type AutoplayCapability = 'allowed' | 'muted-only' | 'blocked';
export type PlaybackMode = 'normal' | 'shuffle' | 'repeat';
