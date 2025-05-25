import { Component, OnInit, inject } from '@angular/core';
import { AccountService } from './account/account.service';
import { SharedService } from './shared/shared.service';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NgIf, NgFor, AsyncPipe, TitleCasePipe } from '@angular/common';
import { UserHasRoleDirective } from './shared/directives/user-has-role.directive';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { rxResource } from '@angular/core/rxjs-interop';
import { MenuServiceService } from './shared/services/menu-service.service';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconService } from './shared/services/svg-icon.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('fadein', [
      state('in', style({
        opacity: 1,
        transform: 'translateX(0)'
      })),
      transition('void => *', [
        style({
          opacity: 0,
          transform: 'translateX(-100px)'
        }),
        animate(5000)
      ]),
      transition('* => void', [
        animate(5000, style({
          transform: 'translateX(100px)',
          opacity: 0
        }))
      ])
    ])
  ],
  imports: [NgxSpinnerComponent, MatIconModule , RouterOutlet, RouterLink, NgIf, UserHasRoleDirective, NgFor, AsyncPipe, TitleCasePipe]
})
export class AppComponent implements OnInit {
  accountService = inject(AccountService);
  menuService = inject(MenuServiceService);
  svgIconService = inject(SvgIconService);
  private sharedService = inject(SharedService);
  Admin: string = 'admin';

  photoMenu = this.menuService.photoMenu;
  bookMenu = this.menuService.bookMenu;
  linkMenu = this.menuService.linkMenu;
  videoMenu = this.menuService.videoMenu;
  movieMenu = this.menuService.movieMenu;
  musicMenu = this.menuService.musicMenu;

  ngOnInit(): void {
    this.refreshUser();
  }


  public refreshUser() {
    const jwt = this.accountService.getJWT();
    if (jwt) {
      this.accountService.refreshUser(jwt).subscribe({
        next: _ => { },
        error: error => {
          this.accountService.logout();
          this.sharedService.showNotification(false, 'Account blocked', error.error);
        }
      })
    } else {
      this.accountService.refreshUser(null).subscribe();
    }
  }
  isViewAble(folder: string): boolean {
    return (this.accountService.isAdminUser && folder == 'bob');
  }
  logout() {
    this.accountService.logout();
  }
}
