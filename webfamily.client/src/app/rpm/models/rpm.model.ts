// export class Rpm {
//   recordId: any;
//   title!: string;
//   type!: string;
//   audioType!: string;
//   dateTime: Date;
//   rpmTracks: rpmTrack[];
//   constructor() {
//     this.recordId = '00000000-0000-0000-0000-000000000000';
//     this.title = "";
//     this.rpmTracks = [];
//     this.type = "";
//     this.audioType = "";
//     this.dateTime = new Date();
//   }
// }
// export class rpmTrack {
//   recordId: any;
//   rpmId: any;
//   title: string;
//   dateTime: Date;
//   duration: string;
//   rpm: Rpm;
//   constructor() {
//     this.recordId = '00000000-0000-0000-0000-000000000000';
//     this.rpmId = '00000000-0000-0000-0000-000000000000';
//     this.title = "";
//     this.duration = '';
//     this.rpm = new Rpm;
//     this.dateTime = new Date();
//   }
// }
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