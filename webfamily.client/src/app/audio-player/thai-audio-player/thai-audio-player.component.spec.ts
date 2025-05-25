import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThaiAudioPlayerComponent } from './thai-audio-player.component';

describe('ThaiAudioPlayerComponent', () => {
  let component: ThaiAudioPlayerComponent;
  let fixture: ComponentFixture<ThaiAudioPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThaiAudioPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThaiAudioPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
