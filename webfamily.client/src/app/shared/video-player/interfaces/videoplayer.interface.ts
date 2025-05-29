export interface AudioTrack {
  enabled: boolean;
  id: number;
  kind: string;
  label: string;
  language: string;
  src: string;
  sourceBuffer: SourceBuffer | null;
  default: boolean;
}
export interface VideoFile {
  title: string;
  src: string;
  type: string;
  poster?: string;
  duration?: number;
  description?: string;
  captions?: VideoTrack[];
  audioTracks?: AudioTrack[]; // Add this line
  chapters?: Chapter[]; // Add this line  
}

/* captions */
export interface VideoTrack {
  src: string;
  kind: string;
  srclang: string;
  label: string;
  default?: boolean;
}
export interface Chapter {
  title: string;
  start: number;
  end: number;
}
export interface Chapter {
  title: string;
  start: number;
  end: number;
}
