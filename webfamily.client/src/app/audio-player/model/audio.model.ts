export interface audioInterface {
  id: number;
  url: string;
  title: string;
  cover: string;
  type: string;
}
export class audioRecords {
  id: number
  url: string;
  title: string;
  cover: string;
  type: string;
  constructor(v: audioInterface) {
    this.id = v.id;
    this.url = v.url;
    this.title = v.title;
    this.cover = v.cover;
    this.type = v.cover
  }
}
