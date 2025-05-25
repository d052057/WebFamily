export class Webtube {
  recordId: any;
  webTubeLink: string;
  videoId: string;
  videoListId: string;
  webTubeTitle: string;
  note: string;
  category: string;
  dateTime!: Date;
  thumbnailDefaultUrl: string;
  thumbnailMediumUrl: string;
  thumbnailHighUrl: string;
  thumbnailStandardUrl: string;
  thumbnailMaxresUrl: string;

  thumbnailDefaultWidth: string;
  thumbnailMediumWidth: string;
  thumbnailHighWidth: string;
  thumbnailStandardWidth: string;
  thumbnailMaxresWidth: string;

  thumbnailDefaultHeight: string;
  thumbnailMediumHeight: string;
  thumbnailHighHeight: string;
  thumbnailStandardHeight: string;
  thumbnailMaxresHeight: string;
  webTubeSeries: WebtubeSeries[];
  constructor() {
    this.recordId = '00000000-0000-0000-0000-000000000000';
    this.webTubeLink = '';
    this.webTubeTitle = '';
    this.note = '';
    this.category = '';
    this.videoId = '';
    this.videoListId = '';
    this.webTubeSeries = [];
    this.dateTime = new Date();
    this.thumbnailDefaultUrl = '';
    this.thumbnailMediumUrl = '';
    this.thumbnailHighUrl = '';
    this.thumbnailStandardUrl = '';
    this.thumbnailMaxresUrl = '';
    this.thumbnailDefaultWidth = '';
    this.thumbnailMediumWidth = '';
    this.thumbnailHighWidth = '';
    this.thumbnailStandardWidth = '';
    this.thumbnailMaxresWidth = '';

    this.thumbnailDefaultHeight = '';
    this.thumbnailMediumHeight = '';
    this.thumbnailHighHeight = '';
    this.thumbnailStandardHeight = '';
    this.thumbnailMaxresHeight = '';
  }
}
export class WebtubeSeries {
  recordId: any;
  webTubeId: any;
  videoId: string;
  videoTitle: string;
  thumbNailDefaultUrl: string;
  thumbNailDefaultWidth: string;
  thumbNailDefaultHeight: string;
  thumbNailMediumUrl: string;
  thumbNailMediumWidth: string;
  thumbNailMediumHeight: string;
  thumbNailHighUrl: string;
  thumbNailHighWidth: string;
  thumbNailHighHeight: string;

  thumbNailStandardUrl: string;
  thumbNailStandardWidth: string;
  thumbNailStandardHeight: string;

  thumbNailMaxresUrl: string;
  thumbNailMaxresWidth: string;
  thumbNailMaxresHeight: string;
  seqNumber: number;
  dateTime: Date;
  webTube!: Webtube;

  constructor() {
    this.recordId = '00000000-0000-0000-0000-000000000000';
    this.webTubeId = '00000000-0000-0000-0000-000000000000';
    this.videoId = '';
    this.videoTitle = '';
    this.thumbNailDefaultUrl = '';
    this.thumbNailDefaultWidth = '';
    this.thumbNailDefaultHeight = '';

    this.thumbNailMediumUrl = '';
    this.thumbNailMediumWidth = '';
    this.thumbNailMediumHeight = '';
    this.thumbNailHighUrl = '';
    this.thumbNailHighWidth = '';
    this.thumbNailHighHeight = '';

    this.thumbNailStandardUrl = '';
    this.thumbNailStandardWidth = '';
    this.thumbNailStandardHeight = '';
    this.thumbNailMaxresUrl = '';
    this.thumbNailMaxresWidth = '';
    this.thumbNailMaxresHeight = '';


    this.dateTime = new Date();
    this.seqNumber = 0;
    this.webTube = new Webtube;
  }
}
export class webtubeError {
  "error": {
    "errors": [
      {
        "domain": "usageLimits",
        "reason": "dailyLimitExceeded",
        "message": "Daily Limit Exceeded"
      }
    ],
    "code": 403,
    "message": "Daily Limit Exceeded"
  }
}
export class ConfirmModal {
  type: string;
  confirmTitle: string;
  confirmDesc: string;
  confirmMsg: string;
  constructor() {
    this.type = '';
    this.confirmTitle = '';
    this.confirmDesc = '';
    this.confirmMsg = ''
  }
}
export interface IwebTube {
  recordId: string;
  webTubeLink: string;
  note: string;
  category: string | null;
  videoId: string | null;
  videoListId: string | null;
  webTubeTitle: string | null;
  thumbnailDefaultUrl: string | null;
  thumbnailMediumUrl: string | null;
  thumbnailStandardUrl: string | null;
  thumbnailMaxresUrl: string | null;
  thumbnailDefaultWidth: string | null;
  thumbnailMediumWidth: string | null;
  thumbnailHighWidth: string | null;
  thumbnailStandardWidth: string | null;
  thumbnailMaxresWidth: string | null;

  thumbnailDefaultHeight: string | null;
  thumbnailMediumHeight: string | null;
  thumbnailHighHeight: string | null;
  thumbnailStandardHeight: string | null;
  thumbnailMaxresHeight: string | null;
  dateTime: string;
  webTubeSeries: IwebTubeSeries[];
}
export interface IwebTubeSeries {
  recordId: string;
  webTubeId: string;
  videoId: string;
  videoTitle: string;
  thumbNailDefaultUrl: string | null;
  thumbNailDefaultWidth: string | null;
  thumbNailDefaultHeight: string | null;
  thumbNailMediumUrl: string | null;
  thumbNailMediumWidth: string | null;
  thumbNailMediumHeight: string | null;
  thumbNailHighUrl: string | null;
  thumbNailHighWidth: string | null;
  thumbNailHighHeight: string | null;
  thumbNailStandardUrl: string | null;
  thumbNailStandardWidth: string | null;
  thumbNailStandardHeight: string | null;
  thumbNailMaxresUrl: string | null;
  thumbNailMaxresWidth: string | null;
  thumbNailMaxresHeight: string | null;
  seqNumber: number;
  dateTime: string;
  webTube: IwebTube;
}
export class YTSettings {
  public static readonly YOUTUBE_KEY = 'AIzaSyAMXlgkrQ2vL2jTGd6RWQCwjYw-r0wWIjE';
  public static readonly YOUTUBE_URL = 'https://www.googleapis.com/youtube/v3/playlistItems?key=' + YTSettings.YOUTUBE_KEY + '&part=snippet&maxResults=12&playlistId='
  public static readonly YOUTUBE_URL_ID = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&key=' + YTSettings.YOUTUBE_KEY + '&id='
}
