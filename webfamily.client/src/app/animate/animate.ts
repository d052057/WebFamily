import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-animate',
  styleUrl: './animate.scss',
  templateUrl: './animate.html',
})
export class Animate implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const root = this.host.nativeElement.querySelector('#familyAnimate');
    if (!root) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            root.classList.add('is-playing');
            this.observer?.disconnect(); // play once
          }
        });
      },
      { threshold: 0.4 }
    );

    this.observer.observe(root);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
