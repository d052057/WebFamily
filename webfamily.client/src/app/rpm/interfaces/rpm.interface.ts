export interface RpmCoverItem {
  id: number;
  recordId: string;
  coverUrl: string;
  folder: string;
  artist?: string | null;
  audioType?: string | null;
}
export interface Rpm {
  recordId: string;
  title: string;
  type: string;
  audioType: string;
  dateTime: string;
  artist?: string | null;
  rpmTracks: RpmTrack[];
}
export interface RpmTrack {
  recordId: string;
  rpmId: string;
  title: string;
  dateTime: string;
  /** Whole seconds, from RpmTrack.DurationSeconds. Null if unknown. */
  durationSeconds: number | null;
  /** 1-based order parsed from the file name during regen. Null if unparsed. */
  trackNumber: number | null;
  /** Per-track override for compilation discs; null means "use the album artist". */
  artist?: string | null;
  rpm: Rpm;
}
