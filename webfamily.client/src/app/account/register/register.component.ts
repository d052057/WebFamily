import { Component, ElementRef, OnInit, Renderer2, inject, viewChild } from '@angular/core';
import { AccountService } from '../account.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SharedService } from '../../shared/shared.service';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { CredentialResponse } from 'google-one-tap';
import { jwtDecode } from 'jwt-decode';
import { DOCUMENT, NgIf } from '@angular/common';
import { environment } from '../../../environments/environment.development';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';
declare const FB: any;

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
    imports: [ReactiveFormsModule, NgIf, ValidationMessagesComponent, RouterLink]
})
export class RegisterComponent implements OnInit {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private _renderer2 = inject(Renderer2);
  private _document = inject<Document>(DOCUMENT);

  readonly googleButton = viewChild.required<ElementRef>('googleButton');
  registerForm: FormGroup = new FormGroup({});
  submitted = false;
  errorMessages: string[] = [];

  constructor() {
      this.accountService.user$.pipe(take(1)).subscribe({
        next: (user: User | null) => {
          if (user) {
            this.router.navigateByUrl('/');
          }
        }
      })
    }

  ngOnInit(): void {
    this.initiazeGoogleButton();
    this.initializeForm();
  }

  ngAfterViewInit() {
    const script1 = this._renderer2.createElement('script');
    script1.src = 'https://accounts.google.com/gsi/client';
    script1.async = 'true';
    script1.defer = 'true';
    this._renderer2.appendChild(this._document.body, script1);
  }

  initializeForm() {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(15)]],
      lastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(15)]],
      email: ['', [Validators.required, Validators.pattern('^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$')]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
    })
  }

  register() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.registerForm.valid) {
      this.accountService.register(this.registerForm.value).subscribe({
        next: (response: any) => {
          this.sharedService.showNotification(true, response.value.title, response.value.message);
          this.router.navigateByUrl('/account/login');
        },
        error: error => {
          if (error.error.errors) {
            this.errorMessages = error.error.errors;
          } else {
            this.errorMessages.push(error.error);
          }
        }
      })
    }
  }

  registerWithFacebook() {
    FB.login(async (fbResult: any) => {
      if (fbResult.authResponse) {
        const accessToken = fbResult.authResponse.accessToken;
        const userId = fbResult.authResponse.userID;
        this.router.navigateByUrl(`/account/register/third-party/facebook?access_token=${accessToken}&userId=${userId}`);
      } else {
        this.sharedService.showNotification(false, "Failed", "Unable to register with your facebook");
      }
    })
  }

  private initiazeGoogleButton() {
    (window as any).onGoogleLibraryLoad = () => {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: this.googleCallBack.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      // @ts-ignore
      google.accounts.id.renderButton(
        this.googleButton().nativeElement,
        {size: 'medium', shape: 'rectangular', text: 'signup_with', logo_alignment: 'center'}
      );
    };
  }

  private async googleCallBack(response: CredentialResponse) {
   /* console.log(response);*/
    const decodedToken: any = jwtDecode(response.credential);
    this.router.navigateByUrl(`/account/register/third-party/google?access_token=${response.credential}&userId=${decodedToken.sub}`);
  }
}
