import { TestBed } from '@angular/core/testing';

import { AdminProblemPatternService } from './admin-problem-pattern';

describe('AdminProblemPatternService', () => {
  let service: AdminProblemPatternService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblemPatternService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
