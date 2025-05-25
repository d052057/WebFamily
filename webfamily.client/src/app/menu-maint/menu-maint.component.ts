import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { fadeInOut } from '../shared/services/animations';
@Component({
    selector: 'app-menu-maint',
    imports: [CommonModule, RouterOutlet],
    templateUrl: './menu-maint.component.html',
    styleUrl: './menu-maint.component.scss',
    animations: [fadeInOut]
})
export class MenuMaintComponent {
  private router = inject(Router);
  private activatedRouter = inject(ActivatedRoute);

  menus = [
    'videos','movies','musics'
  ]
  showAdd() {
    this.router.navigate(['./addmenu'], { relativeTo: this.activatedRouter })
  }
  showDel() {
    this.router.navigate(['./delmenu'], { relativeTo: this.activatedRouter })
  }
  showRenameFile() { this.router.navigate(['./renamefile'], { relativeTo: this.activatedRouter }) }
  showRenameMedia() { this.router.navigate(['./renamemedia'], { relativeTo: this.activatedRouter }) }
  showUpdateMenu() { this.router.navigate(['./updatemenu'], { relativeTo: this.activatedRouter }) }
  showUpdateVideoDuration(menu: string) { this.router.navigate(['./updatevideosduration', menu], { relativeTo: this.activatedRouter }) }
}
