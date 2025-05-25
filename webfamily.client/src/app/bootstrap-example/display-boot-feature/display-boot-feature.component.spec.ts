import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayBootFeatureComponent } from '../display-boot-feature/display-boot-feature.component';

describe('DisplayBootFeatureComponent', () => {
  let component: DisplayBootFeatureComponent;
  let fixture: ComponentFixture<DisplayBootFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayBootFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayBootFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
