import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeoAdminComponent } from './seo-admin.component';

describe('SeoAdminComponent', () => {
  let component: SeoAdminComponent;
  let fixture: ComponentFixture<SeoAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeoAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
