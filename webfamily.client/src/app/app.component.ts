import { Component, OnInit, inject } from '@angular/core';
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
  imports: [MatProgressSpinnerModule , MatIconModule , RouterOutlet, RouterLink, UserHasRoleDirective, AsyncPipe, TitleCasePipe]
})
export class AppComponent implements OnInit {
  accountService = inject(AccountService);
  menuService = inject(MenuService);
  loadingService = inject(LoadingService);
  private sharedService = inject(SharedService);
  Admin: string = 'admin';

  ngOnInit(): void {
     // Menus are automatically loaded by the service
    // You can add any additional initialization here

    // Example: Log when menus are ready
    setTimeout(() => {
      const memoryInfo = this.menuService.getMemoryInfo();
      /*console.log('Menu memory info:', memoryInfo);*/
    }, 1000);

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
