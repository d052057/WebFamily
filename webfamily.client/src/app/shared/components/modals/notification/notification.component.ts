import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';


@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./notification.component.css'],
    
})
export class NotificationComponent {
  bsModalRef = inject(BsModalRef);

  isSuccess: boolean = true;
  title: string = '';
  message: string = '';

}
