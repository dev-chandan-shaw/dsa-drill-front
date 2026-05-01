import { TestBed } from '@angular/core/testing';

import { AdminProblem } from './admin-problem';

describe('AdminProblem', () => {
  let service: AdminProblem;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblem);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
