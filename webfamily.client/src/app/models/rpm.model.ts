export interface Rpm {
  recordId: string;
  title: string;
  type: string;
  audioType: string;
  dateTime: string;
  rpmTracks: RpmTrack[];
}
export interface RpmTrack {
  recordId: string;
  rpmId: string;
  title: string;
  dateTime: string;
  duration: string | null;
  rpm: Rpm;
}
