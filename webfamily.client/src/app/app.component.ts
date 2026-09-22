import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { AccountService } from './account/account.service';
import { SharedService } from './shared/shared.service';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { UserHasRoleDirective } from './shared/directives/user-has-role.directive';
import { MatIconModule } from '@angular/material/icon';
import { MenuService } from './shared/services/menu.service';
import { LoadingService } from './shared/services/loading.service';
import { MediaFolderTreeService } from './shared/services/media-folder-tree.service';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private treeService = inject(MediaFolderTreeService);

  // Top-level folders (movie/video groups) for the Movies/Videos/Frames
  // dropdowns. One-shot fetches, independent of each other and of whatever
  // menu song-browser/Music Maintenance/play-media currently have selected -
  // the nav bar needs both lists available at the same time, which the
  // shared single `menu` signal on MediaFolderTreeService can't do.
  readonly movieGroups = toSignal(this.treeService.getTree('movies'), { initialValue: [] });
  readonly videoGroups = toSignal(this.treeService.getTree('videos'), { initialValue: [] });
  readonly bookGroups = toSignal(this.treeService.getTree('books'), { initialValue: [] });
  readonly photoGroups = toSignal(this.treeService.getTree('photos'), { initialValue: [] });

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
  logout() {
    this.accountService.logout();
  }
}
