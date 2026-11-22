import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    // Model the pre-paint script: ThemeService hydrates its initial DOM class.
    document.documentElement.classList.add('dark');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => document.documentElement.classList.remove('dark'));

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
