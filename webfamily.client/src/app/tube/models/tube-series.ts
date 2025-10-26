export class TubeSeries {
  videoTitle: any;
  urlThumbNailDefault: any;
  urlThumbNailMedium: any;
  videoId: any;

  ThumbNailDefaultUrl: any = '';
  ThumbNailStandardUrl: any = '';
  ThumbNailMediumUrl: any = '';
  ThumbNailHighUrl: any = '';
  ThumbNailMaxresUrl: any = '';
 
  ThumbNailDefaultWidth: any = '';
  ThumbNailStandardWidth: any = '';
  ThumbNailMediumWidth: any = '';
  ThumbNailHighWidth: any = '';
  ThumbNailMaxresWidth: any = '';

  ThumbNailDefaultHeight: any = '';
  ThumbNailStandardHeight: any = '';
  ThumbNailMediumHeight: any = '';
  ThumbNailHighHeight: any = '';
  ThumbNailMaxresHeight: any = '';


  seqNumber: number;

  constructor(v: any, _seqNum = 0) {
    this.seqNumber = _seqNum;
    this.videoTitle = v.snippet.title;
    this.videoId = v.snippet.resourceId.videoId;
    if (Object.keys(v.snippet.thumbnails).length > 0) {

      this.ThumbNailDefaultUrl = v.snippet.thumbnails['default']?.url ?? '';
      this.ThumbNailStandardUrl = v.snippet.thumbnails['standard']?.url ?? '';
      this.ThumbNailMediumUrl = v.snippet.thumbnails['medium']?.url ?? '';
      this.ThumbNailHighUrl = v.snippet.thumbnails['high']?.url ?? '';
      this.ThumbNailMaxresUrl = v.snippet.thumbnails['maxres']?.url ?? '';

      this.ThumbNailDefaultWidth = v.snippet.thumbnails['default']?.width.toString() ?? '';
      this.ThumbNailStandardWidth = v.snippet.thumbnails['standard']?.width.toString() ?? '';
      this.ThumbNailMediumWidth = v.snippet.thumbnails['medium']?.width.toString() ?? '';
      this.ThumbNailHighWidth = v.snippet.thumbnails['high']?.width.toString() ?? '';
      this.ThumbNailMaxresWidth = v.snippet.thumbnails['maxres']?.width.toString() ?? '';

      this.ThumbNailDefaultHeight = v.snippet.thumbnails['default']?.height.toString() ?? '';
      this.ThumbNailStandardHeight = v.snippet.thumbnails['standard']?.height.toString() ?? '';
      this.ThumbNailMediumHeight = v.snippet.thumbnails['medium']?.height.toString() ?? '';
      this.ThumbNailHighHeight = v.snippet.thumbnails['high']?.height.toString() ?? '';
      this.ThumbNailMaxresHeight = v.snippet.thumbnails['maxres']?.height.toString() ?? '';

      this.seqNumber = _seqNum;
    }
  }
}
