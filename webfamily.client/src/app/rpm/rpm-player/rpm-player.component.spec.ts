import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RpmPlayerComponent } from './rpm-player.component';

describe('RpmPlayerComponent', () => {
  let component: RpmPlayerComponent;
  let fixture: ComponentFixture<RpmPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RpmPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RpmPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
