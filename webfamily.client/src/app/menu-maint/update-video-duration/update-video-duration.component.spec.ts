import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateVideoDurationComponent } from './update-video-duration.component';

describe('UpdateVideoDurationComponent', () => {
  let component: UpdateVideoDurationComponent;
  let fixture: ComponentFixture<UpdateVideoDurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateVideoDurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateVideoDurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
