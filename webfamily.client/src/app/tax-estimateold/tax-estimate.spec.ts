import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxEstimate } from './tax-estimate';

describe('TaxEstimate', () => {
  let component: TaxEstimate;
  let fixture: ComponentFixture<TaxEstimate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxEstimate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxEstimate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
