export interface AudioItem {
  id: number,
  url: string;
  title?: string;
  duration: number;
  cover?: string;
  type?: string;
}
// Types for better type safety
export type AutoplayCapability = 'allowed' | 'muted-only' | 'blocked';
export type PlaybackMode = 'normal' | 'shuffle' | 'repeat';
