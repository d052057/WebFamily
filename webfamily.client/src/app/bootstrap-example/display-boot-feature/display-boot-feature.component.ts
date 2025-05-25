
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, Renderer2 } from "@angular/core";
import { SafeHtml, DomSanitizer } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-display-boot-feature',
  imports: [],
  templateUrl: './display-boot-feature.component.html',
  styleUrls: ['./display-boot-feature.component.scss']
})
export class DisplayBootFeatureComponent implements OnInit {
  htmlContent: SafeHtml = '';
  http = inject(HttpClient);
  activatedRoute = inject(ActivatedRoute);
  sanitizer = inject(DomSanitizer);
  renderer2 = inject(Renderer2);
  document = inject(DOCUMENT);
  folder: string = '';
  item: string = '';
  css = [
    'badges.css',
    'blog.css',
    'blog.rtl.css',
    'breadcrumbs.css',
    'carousel.css',
    'carousel.rtl.css',
    'cheatsheet.css',
    'cheatsheet.rtl.css',
    'checkout.css',
    'cover.css',
    'dashboard.css',
    'dashboard.rtl.css',
    'dropdowns.css',
    'features.css',
    'grid.css',
    'headers.css',
    'heroes.css',
    'jumbotrons.css',
    'list-groups.css',
    'modals.css',
    'navbar-fixed.css',
    'navbar-static.css',
    'navbars.css',
    'navbars-offcanvas.css',
    'offcanvas-navbar.css',
    'pricing.css',
    'product.css',
    'sidebars.css',
    'sign-in.css',
    'sticky-footer.css',
    'sticky-footer-navbar.css'
  ]
  js = [

    'cheatsheet.js',
    'checkout.js',
    'dashboard.js',
    'offcanvas-navbar.js',
    'sidebars.js',
  ]
  constructor() { }
  ngOnInit() {
    this.activatedRoute.paramMap
      .subscribe(
        (params: any) => {

          this.folder = '';
          this.item = params.get('item');

          this.folder = 'assets/bootstrap-5.3.3/' + this.item + '/index.html';

          this.http.get(this.folder, { responseType: 'text' })
            .subscribe(response => {
              this.htmlContent = this.sanitizer.bypassSecurityTrustHtml(response); 
              this.loadStylesheet(this.item);
              this.loadJs(this.item);
            });
        }
      );
  }
  loadStylesheet(feature: string) {
    const url = 'assets/bootstrap-5.3.3/' + feature + '/' + feature + '.css'
    const cssFile = feature + '.css';
    for (const c of this.css) {
      if (c === cssFile) {
        const link = this.renderer2.createElement('link');
        this.renderer2.setAttribute(link, 'rel', 'stylesheet');
        this.renderer2.setAttribute(link, 'href', url);
        this.renderer2.appendChild(this.document.head, link);
      }
    }
  }
  loadJs(feature: string) {
    let jsFile = '';
    if (feature === 'dashboard.rtl') {
      jsFile = 'dashboard.js';
    } else {
      jsFile = feature + '.js';
    }
    const scriptSrc = 'assets/bootstrap-5.3.3/' + feature + '/' + jsFile;
    for (const c of this.js) {
      if (c === jsFile) {
        const script = this.document.createElement('script');
        script.type = 'text/javascript';
        script.src = scriptSrc;
        script.async = true;
        this.document.head.appendChild(script);
      }
    }
  }
}

