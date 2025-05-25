import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelmenuComponent } from './delmenu.component';

describe('DelmenuComponent', () => {
  let component: DelmenuComponent;
  let fixture: ComponentFixture<DelmenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [DelmenuComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DelmenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
