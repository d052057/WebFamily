import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

@Component({
    selector: 'app-validation-messages',
    templateUrl: './validation-messages.component.html',
    styleUrls: ['./validation-messages.component.css'],
    imports: [NgIf, NgFor]
})
export class ValidationMessagesComponent {
  @Input() errorMessages: string[] | undefined;

}
