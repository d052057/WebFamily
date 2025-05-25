import { Component, OnInit, inject } from '@angular/core';
import { AccountService } from '../account.service';
import { SharedService } from '../../shared/shared.service';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { User } from '../../shared/models/account/user';
import { ConfirmEmail } from '../../shared/models/account/confirmEmail';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-confirm-email',
    templateUrl: './confirm-email.component.html',
    styleUrls: ['./confirm-email.component.css'],
    imports: [NgIf]
})
export class ConfirmEmailComponent implements OnInit {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  success = true;

  ngOnInit(): void {
    this.accountService.user$.pipe(take(1)).subscribe({
      next: (user: User | null) =>{
        if (user) {
          this.router.navigateByUrl('/');
        } else {
          this.activatedRoute.queryParamMap.subscribe({
            next: (params: any) => {
              const confirmEmail: ConfirmEmail = {
                token: params.get('token'),
                email: params.get('email'),
              }

              this.accountService.confirmEmail(confirmEmail).subscribe({
                next: (response: any) => {
                  this.sharedService.showNotification(true, response.value.title, response.value.message);
                  this.router.navigateByUrl('/account/login');
                }, error: error => {
                  this.success = false;
                  this.sharedService.showNotification(false, "Failed", error.error);
                }
              })
            }
          })
        }
      }
    })
  }

  resendEmailConfirmationLink() {
    this.router.navigateByUrl('/account/send-email/resend-email-confirmation-link');
  }

}
