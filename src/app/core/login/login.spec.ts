import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';

import { Login } from './login';

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

  it('should redirect to Google on Google sign-in', () => {
    queryParams = {};
    create();

    const button = fixture!.nativeElement.querySelector('.google-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(locationHref).toBe(environment.googleOAuthRedirectUrl);
  });

  it('should fire no auth request on an ordinary visit (session is cookie-based)', () => {
    queryParams = {};
    create();

    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
    expect(snackCalls.length).toBe(0);
    expect(navigated.length).toBe(0);
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
