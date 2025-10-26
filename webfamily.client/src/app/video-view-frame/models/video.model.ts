
export const Speed_array: number[] = [0.5, 0.75, 1, 1.25, 1.50, 1.75, 2, 2.25, 2.50, 2.75, 3]  

// Define AudioTrack interface since it's not available in all browsers TypeScript definitions
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
export class VideoSource {
  public id: number;
  public title: string;
  public src: string;
  public type: string;
  public poster: string;
  public duration: number;
  public description?: string;
  public captions: VideoTrack[];
  public audioTracks: AudioTrack[]; // Add this line
  public chapters: Chapter[]; // Add this line
  public hasCaptions: boolean;
  public hasChapters: boolean; 
  public hasAudioTracks: boolean;
  constructor(jsonFile: VideoFile, id: number) {
    this.id = id;
    this.title = jsonFile.title;
    this.src = jsonFile.src;
    this.type = jsonFile.type;
    this.poster = jsonFile?.poster || '';
    this.duration = jsonFile.duration || 0;
    this.description = jsonFile.description || '';

    this.captions = jsonFile?.captions || [];
    this.audioTracks = jsonFile?.audioTracks || []; 
    this.chapters = jsonFile?.chapters || [];

    this.hasAudioTracks = !!jsonFile.audioTracks?.length;
    this.hasChapters = !!jsonFile.chapters?.length;
    this.hasCaptions = !!jsonFile.captions?.length;
  }
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
