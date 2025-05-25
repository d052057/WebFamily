import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxVideoPlayerComponent } from './ngx-video-player.component';

describe('NgxVideoPlayerComponent', () => {
  let component: NgxVideoPlayerComponent;
  let fixture: ComponentFixture<NgxVideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [NgxVideoPlayerComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(NgxVideoPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
