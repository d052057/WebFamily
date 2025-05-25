import { Component, ElementRef, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountService } from '../account.service';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { SharedService } from '../..//shared/shared.service';
import { LoginWithExternal } from '../../shared/models/account/loginWithExternal';
import { DOCUMENT, NgIf } from '@angular/common';
import { CredentialResponse } from 'google-one-tap';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';
declare const FB: any;

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    imports: [ReactiveFormsModule, NgIf, ValidationMessagesComponent, RouterLink]
})
export class LoginComponent implements OnInit {
  private accountService = inject(AccountService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private sharedService = inject(SharedService);
  private _renderer2 = inject(Renderer2);
  private _document = inject<Document>(DOCUMENT);

  @ViewChild('googleButton', {static: true}) googleButton: ElementRef = new ElementRef({});
  loginForm: FormGroup = new FormGroup({});
  submitted = false;
  errorMessages: string[] = [];
  returnUrl: string | null = null;

  constructor() { 
      this.accountService.user$.pipe(take(1)).subscribe({
        next: (user: User | null) => {
          if (user) {
            this.router.navigateByUrl('/');
          } else {
            this.activatedRoute.queryParamMap.subscribe({
              next: (params: any) => {
                if (params) {
                  this.returnUrl = params.get('returnUrl');
                }
              }
            })
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
    this.loginForm = this.formBuilder.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
    })
  }

  login() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.loginForm.valid) {
      this.accountService.login(this.loginForm.value).subscribe({
        next: _ => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.router.navigateByUrl('/');
          }
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

  loginWithFacebook() {
    FB.login(async (fbResult: any) => {
      if (fbResult.authResponse) {
        const accessToken = fbResult.authResponse.accessToken;
        const userId = fbResult.authResponse.userID;
        
        this.accountService.loginWithThirdParty(new LoginWithExternal(accessToken, userId, "facebook")).subscribe({
          next: () => {
            if (this.returnUrl) {
              this.router.navigateByUrl(this.returnUrl);
            } else {
              this.router.navigateByUrl('/');
            }
          },
          error: error => {
            this.sharedService.showNotification(false, "Failed", error.error);
          }
        })
      } else {
        this.sharedService.showNotification(false, "Failed", "Unable to login with your facebook");
      }
    })
  }

  resendEmailConfirmationLink() {
    this.router.navigateByUrl('/account/send-email/resend-email-confirmation-link');
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
        this.googleButton.nativeElement,
        {size: 'medium', shape: 'rectangular', text: 'signin_with', logo_alignment: 'center'}
      );
    };
  }

  private async googleCallBack(response: CredentialResponse) {
    const decodedToken: any = jwtDecode(response.credential);
    this.accountService.loginWithThirdParty(new LoginWithExternal(response.credential, decodedToken.sub, "google"))
      .subscribe({
        next: _ => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.router.navigateByUrl('/');
          }
        }, error: error => {
          this.sharedService.showNotification(false, "Failed", error.error);
        }
      })
  }
}
