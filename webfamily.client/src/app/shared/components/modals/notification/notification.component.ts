import { Component, inject } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.css'],
    imports: [NgClass]
})
export class NotificationComponent {
  bsModalRef = inject(BsModalRef);

  isSuccess: boolean = true;
  title: string = '';
  message: string = '';

}
