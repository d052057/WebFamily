import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RockRollComponent } from './rock-roll.component';

describe('RockRollComponent', () => {
  let component: RockRollComponent;
  let fixture: ComponentFixture<RockRollComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RockRollComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RockRollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
