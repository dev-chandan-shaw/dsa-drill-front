import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';

import { Login } from './login';

const OAUTH_RETURN_KEY = 'dsa-drill-oauth-return';

function createMemoryStorage() {
  const data = new Map<string, string>();
  const stub: StorageService = {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => void data.set(key, value),
    remove: (key: string) => void data.delete(key),
  } as StorageService;
  return { stub, data };
}

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login> | null = null;
  let httpMock: HttpTestingController;
  let queryParams: Record<string, string>;
  let navigatedByUrl: unknown[][];
  let navigated: unknown[][];
  let snackCalls: unknown[][];
  let locationHref = '';
  let memStore: Map<string, string>;

  beforeEach(async () => {
    queryParams = {};
    navigatedByUrl = [];
    navigated = [];
    snackCalls = [];
    const memory = createMemoryStorage();
    memStore = memory.data;
    locationHref = 'http://localhost/';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {},
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => locationHref,
      set: (value: string) => {
        locationHref = value;
      },
    });

    await TestBed.configureTestingModule({
      imports: [Login, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: memory.stub },
        {
          provide: ActivatedRoute,
          useFactory: () => ({
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
          }),
        },
        {
          provide: Router,
          useValue: {
            url: '/',
            navigateByUrl: (...args: unknown[]) => {
              navigatedByUrl.push(args);
              return Promise.resolve(true);
            },
            navigate: (...args: unknown[]) => {
              navigated.push(args);
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: MatSnackBar,
          useValue: {
            open: (...args: unknown[]) => {
              snackCalls.push(args);
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(): void {
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('should store the return URL and redirect to Google on Google sign-in', () => {
    queryParams = { returnUrl: '/admin' };
    create();

    const button = fixture!.nativeElement.querySelector('.google-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(memStore.get(OAUTH_RETURN_KEY)).toBe('/admin');
    expect(locationHref).toBe(environment.googleOAuthRedirectUrl);
  });

  it('should exchange an OAuth token and navigate to the stored return URL', () => {
    queryParams = { token: 'oauth-jwt-123' };
    create();
    memStore.set(OAUTH_RETURN_KEY, '/admin');

    // loadCurrentUser fires first (no session yet) and fails...
    const initial = httpMock.expectOne(`${environment.apiUrl}/auth/user`);
    initial.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    // ...then the token exchange runs.
    const exchange = httpMock.expectOne(`${environment.apiUrl}/auth/user?token=oauth-jwt-123`);
    exchange.flush({ id: 7, email: 'g@example.com', firstName: 'G', lastName: 'User' });

    expect(navigatedByUrl).toEqual([['/admin']]);
    expect(snackCalls.length).toBeGreaterThan(0);
    expect(String(snackCalls[0][0])).toContain('Signed in with Google');
    expect(memStore.get(OAUTH_RETURN_KEY)).toBeUndefined();
  });

  it('should toast an error and strip params when Google reports an error', () => {
    queryParams = { error: 'true', msg: 'access_denied' };
    create();

    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
    expect(snackCalls.length).toBe(1);
    expect(String(snackCalls[0][0])).toContain('Google sign-in failed');
    // OAuth params are stripped from the URL.
    expect(navigated.length).toBe(1);
  });
});
