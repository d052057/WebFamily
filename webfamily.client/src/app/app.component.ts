import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { AccountService } from './account/account.service';
import { SharedService } from './shared/shared.service';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { UserHasRoleDirective } from './shared/directives/user-has-role.directive';
import { MatIconModule } from '@angular/material/icon';
import { MenuService } from './shared/services/menu.service';
import { LoadingService } from './shared/services/loading.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule , MatIconModule , RouterOutlet, RouterLink, UserHasRoleDirective, AsyncPipe, TitleCasePipe]
})
export class AppComponent implements OnInit {
  accountService = inject(AccountService);
  menuService = inject(MenuService);
  loadingService = inject(LoadingService);
  private sharedService = inject(SharedService);

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
