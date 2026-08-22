import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AccountService } from 'src/app/account/account.service';
import { SharedService } from '../shared.service';
import { User } from '../models/account/user';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private router = inject(Router);


  canActivate(): Observable<boolean> {
    return this.accountService.user$.pipe(
      map((user: User | null) => {

        if (user) {
          const decodedToken: any = jwtDecode(user.jwt);
          // A JWT with exactly one role claim decodes `role` as a plain
          // string, not an array - only 2+ roles produce an array.
          // Normalize both cases (and the no-roles case) explicitly.
          const rawRole = decodedToken.role;
          const roles: string[] = Array.isArray(rawRole) ? rawRole : (rawRole ? [rawRole] : []);
          if (roles.includes('Admin')) {
            return true;
          }
        }

        this.sharedService.showNotification(false, 'Admin Area', 'Leave now!');
        this.router.navigateByUrl('/');

        return false;
      })
    );
  }

}
