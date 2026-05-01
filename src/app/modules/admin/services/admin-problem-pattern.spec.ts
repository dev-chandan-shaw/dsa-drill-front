import { TestBed } from '@angular/core/testing';

import { AdminProblemPattern } from './admin-problem-pattern';

describe('AdminProblemPattern', () => {
  let service: AdminProblemPattern;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblemPattern);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
