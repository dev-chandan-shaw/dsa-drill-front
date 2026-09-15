import { TestBed } from '@angular/core/testing';

import { AdminProblemService } from './admin-problem';

describe('AdminProblemService', () => {
  let service: AdminProblemService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
