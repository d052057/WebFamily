export class mediaDirectory {
  recordId: any;
  menuId: any;
  directory!: string;
  datetime!: Date;
  menu!: {
    recordId: any;
    menu: string;
    datetime: Date;
    mediaDirectories: any[];
  };
  mediaMetaData!: any[];
  constructor() {
    this.directory = '';
    this.menu = new mediaMenu;
  }
}
export class mediaMenu {
  recordId: any;
  menu!: string;
  datetime!: Date;
  mediaDirectories!: mediaDirectory[];
  constructor() {
    this.menu = '';
    this.mediaDirectories = [];
  }

}
export class mediaMetaDatum {
  recordId: any;
  directoryId: any;
  title!: string;
  type!: string;
  caption: string;
  datetime!: Date;
  duration?: string;
  directory!: mediaDirectory;
  constructor() {
    this.caption = '';
    this.title = '';
    this.type = '';
    this.duration = '';
    this.directory = new mediaDirectory;
  }
}
export enum RESOURCE_MODES {
  ROCK = 'americanmusics',
}
