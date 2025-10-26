export class Song {
  directory: any[];
  title: any[];
  duration: any[];
  index: any[];
  constructor() {
    this.directory = [];
    this.title = [];
    this.index = [];
    this.duration = [];
  }
}
export interface AmericanMusicsDirectoryViews {
  directory: string
}
