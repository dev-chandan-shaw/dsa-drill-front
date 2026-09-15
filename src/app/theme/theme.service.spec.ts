import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should default to dark mode', () => {
    expect(service.isDark()).toBe(true);
  });

  it('should toggle between dark and light mode', () => {
    service.toggle();

    expect(service.isDark()).toBe(false);

    service.toggle();

    expect(service.isDark()).toBe(true);
  });
});
