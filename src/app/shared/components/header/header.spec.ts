import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ThemeService } from '../../../theme/theme.service';

import { Header } from './header';

const SNAPSHOT_KEY = 'dsa-drill-user';
// Realistic API payload shape (id included — required for hydration).
const USER = {
  id: 9,
  email: 'g@example.com',
  firstName: 'G',
  lastName: 'User',
  role: 'ROLE_USER',
  profilePictureUrl: 'https://example.com/pic.png',
};

function createMemoryStorage(seed: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(seed));
  const stub = {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => void data.set(key, value),
    remove: (key: string) => void data.delete(key),
  } as StorageService;
  return { stub, data };
}

describe('Header auth states', () => {
  let fixture: ComponentFixture<Header>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  function setup(seed: Record<string, string> = {}): void {
    const memory = createMemoryStorage(seed);
    TestBed.configureTestingModule({
      imports: [Header, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: memory.stub },
        {
          provide: Router,
          useValue: {
            url: '/',
            navigateByUrl: () => Promise.resolve(true),
            navigate: () => Promise.resolve(true),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
  }

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  }

  it('should create without firing any auth request on its own', () => {
    setup();

    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
  });

  it('should reserve blank space (never the Login button) while auth is unresolved', () => {
    setup();
    authService.loadCurrentUser().subscribe();
    fixture.detectChanges();

    // Revalidation in flight: reserved placeholder, no Login, no avatar.
    expect(query('.avatar-reserved')).toBeTruthy();
    expect(query('.login-button')).toBeNull();
    expect(query('.avatar-image')).toBeNull();

    // 401 resolves logged-out: placeholder swaps to Login.
    httpMock.expectOne(`${environment.apiUrl}/auth/user`).flush('unauthorized', {
      status: 401,
      statusText: 'Unauthorized',
    });
    fixture.detectChanges();

    expect(query('.avatar-reserved')).toBeNull();
    expect(query('.login-button')).toBeTruthy();
  });

  it('should render the avatar immediately from a hydrated snapshot without HTTP', () => {
    setup({ [SNAPSHOT_KEY]: JSON.stringify(USER) });

    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
    expect(query('.avatar-reserved')).toBeNull();
    expect(query('.login-button')).toBeNull();
    const img = query('.avatar-image') as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(USER.profilePictureUrl);
  });

  it('should ignore a legacy snapshot without an id (real API payloads lacked it)', () => {
    const { id: _dropped, ...withoutId } = USER;
    setup({ [SNAPSHOT_KEY]: JSON.stringify(withoutId) });
    authService.loadCurrentUser().subscribe();
    fixture.detectChanges();

    // Treated as logged out: revalidates over HTTP instead of hydrating.
    httpMock.expectOne(`${environment.apiUrl}/auth/user`).flush('unauthorized', {
      status: 401,
      statusText: 'Unauthorized',
    });
    fixture.detectChanges();

    expect(query('.login-button')).toBeTruthy();
    expect(query('.avatar-image')).toBeNull();
  });

  function openProfileMenu(): HTMLElement | null {
    const trigger = query('.profile-trigger') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    trigger!.click();
    fixture.detectChanges();
    return document.querySelector('.profile-menu');
  }

  it('should offer Light mode with a sun icon while dark mode is active', () => {
    setup({
      [SNAPSHOT_KEY]: JSON.stringify(USER),
      'dsa-drill-theme': 'dark',
    });
    TestBed.inject(ThemeService).init();
    fixture.detectChanges();

    const menu = openProfileMenu();
    expect(menu?.textContent).toContain('Light mode');
    expect(menu?.textContent).not.toContain('Dark mode');
    expect(menu?.querySelector('mat-icon')?.textContent?.trim()).toBe('light_mode');
  });

  it('should offer Dark mode with a moon icon while light mode is active', () => {
    setup({
      [SNAPSHOT_KEY]: JSON.stringify(USER),
      'dsa-drill-theme': 'light',
    });
    TestBed.inject(ThemeService).init();
    fixture.detectChanges();

    const menu = openProfileMenu();
    expect(menu?.textContent).toContain('Dark mode');
    expect(menu?.textContent).not.toContain('Light mode');
    expect(menu?.querySelector('mat-icon')?.textContent?.trim()).toBe('dark_mode');
  });
});
