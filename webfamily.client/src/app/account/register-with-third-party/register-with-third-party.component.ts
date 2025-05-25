import { Component, OnInit, inject } from '@angular/core';
import { AccountService } from '../account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { RegisterWithExternal } from '../../shared/models/account/registerWithExternal';
import { NgIf, TitleCasePipe } from '@angular/common';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';

@Component({
    selector: 'app-register-with-third-party',
    templateUrl: './register-with-third-party.component.html',
    styleUrls: ['./register-with-third-party.component.css'],
    imports: [NgIf, ReactiveFormsModule, ValidationMessagesComponent, TitleCasePipe]
})
export class RegisterWithThirdPartyComponent implements OnInit {
  private accountService = inject(AccountService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  registerForm: FormGroup = new FormGroup({});
  submitted = false;
  provider: string | null = null;
  access_token: string | null = null;
  userId: string | null = null;
  errorMessages: string[] = [];

  ngOnInit(): void {
    this.accountService.user$.pipe(take(1)).subscribe({
      next: (user: User | null) => {
        if (user) {
          this.router.navigateByUrl('/');
        } else {
          this.activatedRoute.queryParamMap.subscribe({
            next: (params: any) => {
              this.provider = this.activatedRoute.snapshot.paramMap.get('provider');
              this.access_token = params.get('access_token');
              this.userId = params.get('userId');

              if (this.provider && this.access_token && this.userId &&
                (this.provider === 'facebook' || this.provider === 'google')) {

                  this.initializeForm();
              } else {
                this.router.navigateByUrl('/account/register');
              }
            }
          })
        }
      }
    })
  }

  initializeForm() {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(15)]],
      lastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(15)]]
    });
  }

  register() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.registerForm.valid && this.userId && this.access_token && this.provider) {
      const firstName = this.registerForm.get('firstName')?.value;
      const lastName = this.registerForm.get('lastName')?.value;

      const model = new RegisterWithExternal(firstName, lastName, this.userId, this.access_token, this.provider);
      this.accountService.registerWithThirdParty(model).subscribe({
        next: _ => {
          this.router.navigateByUrl('/');
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
