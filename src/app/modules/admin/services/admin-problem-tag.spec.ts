import { TestBed } from '@angular/core/testing';

import { AdminProblemTag } from './admin-problem-tag';

describe('AdminProblemTag', () => {
  let service: AdminProblemTag;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProblemTag);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
