import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Register } from '../shared/models/account/register';
import { environment } from '../../environments/environment';
import { Login } from '../shared/models/account/login';
import { User } from '../shared/models/account/user';
import { BehaviorSubject, Observable, ReplaySubject, map, of } from 'rxjs';
import { Router } from '@angular/router';
import { ConfirmEmail } from '../shared/models/account/confirmEmail';
import { ResetPassword } from '../shared/models/account/resetPassword';
import { RegisterWithExternal } from '../shared/models/account/registerWithExternal';
import { LoginWithExternal } from '../shared/models/account/loginWithExternal';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSource = new ReplaySubject<User | null>(1);
  user$ = this.userSource.asObservable();
  private isAdmin = new BehaviorSubject<boolean>(false);
  refreshUser(jwt: string | null) {
    if (jwt === null) {
      this.userSource.next(null);
      return of(undefined);
    }

    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + jwt);

    return this.http.get<User>("/api/account/refresh-user-token", {headers}).pipe(
      map((user: User) => {
        if (user) {
          this.setUser(user);
        }
      })
    )
  }

  login(model: Login) {
    return this.http.post<User>("/api/account/login", model)
    .pipe(
      map((user: User) => {
        if (user) {
          this.setUser(user);
        }
      })
    );
  }

  loginWithThirdParty(model: LoginWithExternal) {
    return this.http.post<User>("/api/account/login-with-third-party", model).pipe(
      map((user: User) => {
        if (user) {
          this.setUser(user);
        }
      })
    )
  }

  logout() {
    localStorage.removeItem(environment.userKey);
    this.userSource.next(null);
    this.router.navigateByUrl('/');
  }

  register(model: Register) {
    return this.http.post("/api/account/register", model);
  }

  registerWithThirdParty(model: RegisterWithExternal) {
    return this.http.post<User>("/api/account/register-with-third-party", model).pipe(
      map((user: User) => {
        if (user) {
          this.setUser(user);
        }
      })
    );
  }

  confirmEmail(model: ConfirmEmail) {
    return this.http.put("/api/account/confirm-email", model);
  }

  resendEmailConfirmationLink(email: string) {
    return this.http.post("/api/account/resend-email-confirmation-link/${email}", {});
  }

  forgotUsernameOrPassword(email: string) {
    return this.http.post("/api/account/forgot-username-or-password/${email}", {});
  }

  resetPassword(model: ResetPassword) {
    return this.http.put("/api/account/reset-password", model);
  }

  getJWT() {
    const key = localStorage.getItem(environment.userKey);
    if (key) {
      const user: User = JSON.parse(key);
      return user.jwt;
    } else {
      return null;
    }
  }
  checkUserIdleTimout() {
    // this.user$.pipe(take(1)).subscribe({
    //   next: (user: User | null) => {
    //     // the user is logged in
    //     if (user) {
    //       // if not currently dipsplaying expiring session modal
    //       if (!this.sharedService.displayingExpiringSessionModal) {
    //         this.timeoutId = setTimeout(() => {
    //           this.sharedService.displayingExpiringSessionModal = true;
    //           this.sharedService.openExpiringSessionCountdown();
    //           // in 10 minutes of user incativity
    //         }, 10 * 60 * 1000);
    //       }
    //     }
    //   }
    // })
  }
  private setUser(user: User) {
    localStorage.setItem(environment.userKey, JSON.stringify(user));
    this.userSource.next(user);
    if (user) {
      try {
        const decodedToken: any = jwtDecode(user.jwt);
        let adminRole: any[] = ['Admin'];
        // Ensure `decodedToken.role` is an array
        const roles: string[] = Array.isArray(decodedToken.role) ? decodedToken.role : [];

        if (roles.some(role => adminRole.includes(role))) {
          this.isAdmin.next(true);
        } else {
          this.isAdmin.next(false);
        }
      }
      catch (error) {
        console.error('Error decoding token:', error);
        this.isAdmin.next(false);
      }
    }
    else {
      this.isAdmin.next(false);
    }
  }
  get isAdminUser(): boolean {
    return this.isAdmin.getValue();
  }
  getAll() {
    return this.http.get('/api/account');
  }
}
