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

  it('defaults disableClose to false', () => {
    service.open({} as never);
    expect(service.disableClose).toBe(false);
  });

  it('keeps disableClose while open and resets after close', () => {
    service.open({} as never, undefined, { disableClose: true });
    expect(service.disableClose).toBe(true);

    service.close();
    service.completeClose();
    expect(service.disableClose).toBe(false);
  });
});
