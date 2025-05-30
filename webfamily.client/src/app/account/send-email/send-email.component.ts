import { Component, OnInit, inject } from '@angular/core';
import { AccountService } from '../account.service';
import { SharedService } from '../../shared/shared.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { NgIf } from '@angular/common';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';

@Component({
    selector: 'app-send-email',
    templateUrl: './send-email.component.html',
    styleUrls: ['./send-email.component.css'],
    imports: [NgIf, ReactiveFormsModule, ValidationMessagesComponent]
})
export class SendEmailComponent implements OnInit {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  emailForm: FormGroup = new FormGroup({});
  submitted = false;
  mode: string | undefined;
  errorMessages: string[] = [];

  ngOnInit(): void {
    this.accountService.user$.pipe(take(1)).subscribe({
      next: (user: User | null) => {
        if (user) {
          this.router.navigateByUrl('/');
        } else {
          const mode = this.activatedRoute.snapshot.paramMap.get('mode');
          if (mode) {
            this.mode = mode;
            this.initializeForm();
          }
        }
      }
    })
  }

  initializeForm() {
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.pattern('^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$')]],
    })
  }

  sendEmail() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.emailForm.valid && this.mode) {
      if (this.mode.includes('resend-email-confirmation-link')) {
        this.accountService.resendEmailConfirmationLink(this.emailForm.get('email')?.value).subscribe({
          next: (response: any) => {
            this.sharedService.showNotification(true, response.value.title, response.value.message);
            this.router.navigateByUrl('/account/login');
          }, error: error => {
            if (error.error.errors) {
              this.errorMessages = error.error.errors;
            } else {
              this.errorMessages.push(error.error);
            }
          }
        })
      } else if (this.mode.includes('forgot-username-or-password')) {
        this.accountService.forgotUsernameOrPassword(this.emailForm.get('email')?.value).subscribe({
          next: (response: any) => {
            this.sharedService.showNotification(true, response.value.title, response.value.message);
            this.router.navigateByUrl('/account/login');
          }, error: error => {
            if (error.error.errors) {
              this.errorMessages = error.error.errors;
            } else {
              this.errorMessages.push(error.error);
            }
          }
        })
      }
    }
  }

  cancel() {
    this.router.navigateByUrl('/account/login');
  }
}
