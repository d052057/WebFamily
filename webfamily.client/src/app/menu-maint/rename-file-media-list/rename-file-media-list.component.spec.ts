import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameFileMediaListComponent } from './rename-file-media-list.component';

describe('RenameFileMediaComponent', () => {
  let component: RenameFileMediaListComponent;
  let fixture: ComponentFixture<RenameFileMediaListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [RenameFileMediaListComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameFileMediaListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
