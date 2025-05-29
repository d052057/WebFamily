import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private spinnerService = inject(NgxSpinnerService);

  loadingReqCount = 0;

  loading() {
    this.loadingReqCount++;
    this.spinnerService.show(undefined, {
      type: 'ball-clip-rotate',
      bdColor : "rgba(0, 0, 0, 0.8)",
      color: '#fff',
      size:"medium",
    });
  }

  idle() {
    this.loadingReqCount--;
    if (this.loadingReqCount <= 0) {
      this.loadingReqCount = 0;
      this.spinnerService.hide();
    }
  }
}
