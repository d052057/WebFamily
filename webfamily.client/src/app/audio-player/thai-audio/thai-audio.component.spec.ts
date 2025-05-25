import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThaiAudioComponent } from './thai-audio.component';

describe('ThaiAudioComponent', () => {
  let component: ThaiAudioComponent;
  let fixture: ComponentFixture<ThaiAudioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThaiAudioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThaiAudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
