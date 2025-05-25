import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class SnackService {
  private _snackBar = inject(MatSnackBar);


  openSnackBar(message: string, action: string = 'ok') {
    this._snackBar.open(message, action, {
      duration: 3000,
      verticalPosition: 'top'
    });
  }
}