import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({ selector: '[clickOutside]' })
export class ClickOutsideDirective {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly clickOutside = output<void>();

  @HostListener('document:click', ['$event.target'])
  public onClick(target: Node | null): void {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }

}
