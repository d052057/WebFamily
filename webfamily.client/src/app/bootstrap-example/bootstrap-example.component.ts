import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-bootstrap-example',
  imports: [RouterOutlet, NgFor],
  templateUrl: './bootstrap-example.component.html',
  styleUrl: './bootstrap-example.component.scss',
})
export class BootstrapExampleComponent {

  activatedRoute = inject(ActivatedRoute);
  router = inject(Router)
  items = [
    'album',
    'album-rtl',
    'badges',
    'blog',
    'blog-rtl',
    'breadcrumbs',
    'buttons',
    'carousel',
    'carousel-rtl',
    'cheatsheet',
    'cheatsheet-rtl',
    'checkout',
    'checkout-rtl',
    'cover',
    'dashboard',
    'dashboard-rtl',
    'dropdowns',
    'features',
    'footers',
    'grid',
    'headers',
    'heroes',
    'jumbotron',
    'jumbotrons',
    'list-groups',
    'masonry',
    'modals',
    'navbar-bottom',
    'navbar-fixed',
    'navbar-static',
    'navbars',
    'navbars-offcanvas',
    'offcanvas',
    'offcanvas-navbar',
    'pricing',
    'product',
    'sidebars',
    'sign-in',
    'starter-template',
    'sticky-footer',
    'sticky-footer-navbar'
  ]
  
  constructor() { }
  showBootStrap(item: string) {
    this.router.navigate(['./bootstrap', item],
      {
        relativeTo: this.activatedRoute
      })
  }
  showBootStrapIcons() {
    this.router.navigate(['./bootstrap-icons'],
      {
        relativeTo: this.activatedRoute
      })
  }
}
