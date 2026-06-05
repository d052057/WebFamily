import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
@Component({
    selector: 'app-menu-maint',
  imports: [RouterOutlet, RouterLink],
    templateUrl: './menu-maint.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './menu-maint.component.scss'
})
export class MenuMaintComponent {

  menus = [
    'videos','movies','musics'
  ]
}
