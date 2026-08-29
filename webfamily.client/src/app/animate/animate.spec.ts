import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Animate } from './animate';

describe('Animate', () => {
  let component: Animate;
  let fixture: ComponentFixture<Animate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Animate]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Animate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
