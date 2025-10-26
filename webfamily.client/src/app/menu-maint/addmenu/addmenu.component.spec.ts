import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddmenuComponent } from './addmenu.component';

describe('AddmenuComponent', () => {
  let component: AddmenuComponent;
  let fixture: ComponentFixture<AddmenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [AddmenuComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddmenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
