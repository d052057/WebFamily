import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, take } from 'rxjs';
import { AccountService } from 'src/app/account/account.service';
import { environment  } from '../../../environments/environment';


/*import { jwtDecode } from 'jwt-decode';*/

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private accountService = inject(AccountService);
  //private readonly validLocalHostUrl = /^http(s)?:[\/\\]{2}localhost[\/\\].*/i;
  //private readonly validWebFamilyUrl = /^http(s)?:[\/\\]{2}webfamily[\/\\].*/i;
  //private readonly validWebAngkorLarUrl = /^http(s)?:[\/\\]{2}webangkorlar[\/\\].*/i;

  //private readonly validLocalHostUrlApi = /api[\/\\].*/i;
  constructor() {

  }
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
 /*   console.log("request url:" + request.url);*/
    const isValidUrl = environment.localUrls.some(url => request.url.startsWith(url));
    if (isValidUrl) {
      this.accountService.user$
        .pipe(take(1))
        .subscribe({
          next: user => {
            if (user) {
              //const decodedToken: any = jwtDecode(user.jwt);
              //console.log('Decoded token:', decodedToken.role);
              request = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${user.jwt}`
                }
              });
            }
          }
        });
    }
    return next.handle(request);
  }
}
