import { TestBed } from '@angular/core/testing';

import { SeoAdmin } from './seo-admin';

describe('SeoAdmin', () => {
  let service: SeoAdmin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoAdmin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
