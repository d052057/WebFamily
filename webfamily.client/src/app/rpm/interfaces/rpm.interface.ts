//export interface PictureItem {
//  id: number;
//  src?: string;
//  alt?: string;
//  title?: string;
//  description?: string;
//  [key: string]: any; // Allow additional properties
//}
export interface RpmCoverItem {
  id: number;
  recordId: string;
  coverUrl: string;
  folder: string;
}
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
