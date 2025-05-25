import { TestBed } from '@angular/core/testing';

import { RockRollService } from './rock-roll.service';

describe('RockRollService', () => {
  let service: RockRollService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RockRollService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
