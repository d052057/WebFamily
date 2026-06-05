import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


@Component({
    selector: 'app-validation-messages',
    templateUrl: './validation-messages.component.html',
    styleUrls: ['./validation-messages.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: []
})
export class ValidationMessagesComponent {
  @Input() errorMessages: string[] | undefined;

}
