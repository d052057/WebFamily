import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AccountService } from 'src/app/account/account.service';
import { SharedService } from '../shared.service';
import { User } from '../models/account/user';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationGuard {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private router = inject(Router);


  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> {
    return this.accountService.user$.pipe(
      map((user: User | null) => {
        if (user) {
          return true;
        } else {
          this.sharedService.showNotification(false, 'Restricted Area', 'Leave immediately!');
          this.router.navigate(['account/login'], {queryParams: {returnUrl: state.url}});
          return false;
        }
      })
    );
  }
  
}
