import { TestBed } from '@angular/core/testing';

import { UnifiedSeoService } from './unified-seo.service';

describe('UnifiedSeoService', () => {
  let service: UnifiedSeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnifiedSeoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
