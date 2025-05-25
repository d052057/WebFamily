import { Component, inject } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { NotifierService} from './../notifier/notifier.service';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { CommonModule } from '@angular/common';
@Component({
    selector: 'app-countdown',
    imports: [MatDialogModule, CommonModule],
    templateUrl: './countdown.component.html',
    styleUrl: './countdown.component.scss'
})
export class CountdownComponent {
  private countDownService = inject(NotifierService);
  private dialogRef = inject<MatDialogRef<CountdownComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  countdownSubscription: Subscription | undefined;
  targetTime: number = 10 // Countdown time in seconds
  remainingTime: number = this.targetTime;
  displayTime: string = this.formatTime(this.remainingTime);

  ngOnInit(): void {
    this.startCountDown();
  }
  ngOnDestroy(): void {
    this.stopCountdown();
  }

  startCountDown() {
    this.countdownSubscription = interval(1000).subscribe(() => {
      if (this.remainingTime > 0) {
        this.remainingTime--;
        this.displayTime = this.formatTime(this.remainingTime);
      } else {
        this.stopCountdown();      
        this.countDownService.showNotification('You have been logged out due to inactivity','Ok', 'warning');
        this.dialogRef.close(false);
      }
    })
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${this.pad(minutes)}:${this.pad(remainingSeconds)}`;
  }
  private pad(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }
  private stopCountdown() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }
}
