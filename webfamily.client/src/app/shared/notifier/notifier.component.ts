import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
    selector: 'app-notifier',
    templateUrl: './notifier.component.html',
    styleUrls: ['./notifier.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class NotifierComponent implements OnInit {
  data = inject(MAT_SNACK_BAR_DATA);
  snackBarRef = inject<MatSnackBarRef<NotifierComponent>>(MatSnackBarRef);


  ngOnInit(): void {
  }

}
