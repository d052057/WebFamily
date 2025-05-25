import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameMediaComponent } from './rename-media.component';

describe('RenameMediaComponent', () => {
  let component: RenameMediaComponent;
  let fixture: ComponentFixture<RenameMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [RenameMediaComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
