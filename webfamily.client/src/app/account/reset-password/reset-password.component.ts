import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SharedService } from '../../shared/shared.service';
import { AccountService } from '../account.service';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { ResetPassword } from '../../shared/models/account/resetPassword';
import { NgIf } from '@angular/common';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    imports: [NgIf, ReactiveFormsModule, ValidationMessagesComponent, RouterLink]
})
export class ResetPasswordComponent implements OnInit {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  resetPasswordForm: FormGroup = new FormGroup({});
  token: string | undefined;
  email: string | undefined;
  submitted = false;
  errorMessages: string[] = [];

  ngOnInit(): void {
    this.accountService.user$.pipe(take(1)).subscribe({
      next: (user: User | null) => {
        if (user) {
          this.router.navigateByUrl('/');
        } else {
          this.activatedRoute.queryParamMap.subscribe({
            next: (params: any) => {
              this.token = params.get('token');
              this.email = params.get('email');

              if (this.token && this.email) {
                this.initializeForm(this.email);
              } else {
                this.router.navigateByUrl('/account/login');
              }
            }
          })
        }
      }
    })
  }


  initializeForm(username: string) {
    this.resetPasswordForm = this.formBuilder.group({
      email: [{value: username, disabled: true}],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]]
    })
  }

  resetPassword() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.resetPasswordForm.valid && this.email && this.token) {
      const model: ResetPassword = {
        token: this.token,
        email: this.email,
        newPassword: this.resetPasswordForm.get('newPassword')?.value
      };

      this.accountService.resetPassword(model).subscribe({
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
