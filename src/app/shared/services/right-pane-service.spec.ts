import { TestBed } from '@angular/core/testing';

import { RightPaneService } from './right-pane-service';

describe('RightPaneService', () => {
  let service: RightPaneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RightPaneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
