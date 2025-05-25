import { NgFor } from '@angular/common';
import { Component,input, output} from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

@Component({
    selector: 'app-grid-video',
    imports: [ NgFor],
    templateUrl: './grid-video.component.html',
    styleUrl: './grid-video.component.scss'
})
export class GridVideoComponent {
  videoList = input.required<any>();
  serieSelectedEvent = output<any>();
  /*outputFromObservable*/
  selectSeries(val: any) {
    this.serieSelectedEvent.emit(val);
  }
  getImgUrl(record: any): Observable<string> {
    if (record.thumbNailMaxresUrl.length > 0) {
     return record.thumbNailMaxresUrl;
    }
    if (record.thumbNailHighUrl.length > 0) {
      return record.thumbNailHighUrl;
    }
    if (record.thumbNailMediumUrl.length > 0) {
      return record.thumbNailMediumUrl;
    }
    if (record.thumbNailStandardUrl.length > 0) {
      return record.thumbNailStandardUrl;
    }
    return record.thumbNailDefaultUrl;
  } 
}
