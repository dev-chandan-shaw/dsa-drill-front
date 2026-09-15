import { TestBed } from '@angular/core/testing';

import { AdminProblemTagService } from './admin-problem-tag';

describe('AdminProblemTagService', () => {
  let service: AdminProblemTagService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblemTagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
