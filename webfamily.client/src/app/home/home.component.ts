import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from './hero/hero.component';
import { UnifiedSeoService } from '../shared/services/unified-seo.service';
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [HeroComponent]
})
export class HomeComponent implements OnInit {
  seoService = inject(UnifiedSeoService);
  constructor() { }

  ngOnInit() {
    this.seoService.updateSeoByKey('home');
  }

}
