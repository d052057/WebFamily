import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { mergeMap, Observable, take } from 'rxjs';
import { AccountService } from 'src/app/account/account.service';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private accountService = inject(AccountService);
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isValidUrl = environment.localUrls.some(url => request.url.startsWith(url));

    if (!isValidUrl) {
      return next.handle(request);
    }

    // Skip authentication for login/register endpoints, and for public
    // settings (called during app-initialization, before AccountService's
    // user$ has emitted anything - awaiting it here would deadlock startup)
    if (request.url.includes('/login') || request.url.includes('/register') || request.url.includes('/account') || request.url.includes('/settings')) {
      return next.handle(request); // Go directly, don't check for user
    }

    // For all other endpoints, add auth header
    return this.accountService.user$.pipe(
      take(1),
      mergeMap(user => {
        if (user && user.jwt) {
          const decodedToken: any = jwtDecode(user.jwt);
          //console.log('Adding auth header. Roles:', decodedToken.role);

          const clonedRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${user.jwt}`
            }
          });

          return next.handle(clonedRequest);
        }

        return next.handle(request);
      })
    );
  }
}
