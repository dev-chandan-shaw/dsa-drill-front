import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { StorageService } from '../storage.service';

import { AuthService } from './auth.service';

const USER = { id: 3, email: 'a@b.c', firstName: 'A', lastName: 'B' };

function createMemoryStorage(seed: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(seed));
  const stub = {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => void data.set(key, value),
    remove: (key: string) => void data.delete(key),
  } as StorageService;
  return { stub, data };
}

describe('AuthService user snapshot', () => {
  let httpMock: HttpTestingController;
  let memStore: Map<string, string>;

  function setup(seed: Record<string, string> = {}): AuthService {
    const memory = createMemoryStorage(seed);
    memStore = memory.data;
    TestBed.configureTestingModule({
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
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should hydrate the logged-in state from storage without any HTTP', () => {
    const service = setup({ 'dsa-drill-user': JSON.stringify(USER) });

    expect(service.isLoggedIn()()).toBe(true);
    expect(service.getLoggedInUser()()?.email).toBe('a@b.c');
    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
  });

  it('should hydrate a realistic API payload that includes the user id', () => {
    const apiPayload = {
      ...USER,
      role: 'ROLE_ADMIN',
      profilePictureUrl: 'https://example.com/pic.png',
    };
    const service = setup({ 'dsa-drill-user': JSON.stringify(apiPayload) });

    expect(service.isLoggedIn()()).toBe(true);
    expect(service.getLoggedInUser()()?.id).toBe(3);
    expect(service.isAdmin()()).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/auth/user`);
  });

  it('should ignore a corrupted snapshot', () => {
    const service = setup({ 'dsa-drill-user': 'not-json{{{' });

    expect(service.isLoggedIn()()).toBe(false);
  });

  it('should persist the user snapshot on login', () => {
    const service = setup();
    service.login('a@b.c', 'password123').subscribe();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ ...USER, role: 'ROLE_USER' });

    const stored = memStore.get('dsa-drill-user');
    expect(stored).toContain('a@b.c');
  });

  it('should derive the admin flag on first login (no reload needed)', () => {
    const service = setup();
    expect(service.isAdmin()()).toBe(false);
    service.login('a@b.c', 'password123').subscribe();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ ...USER, role: 'ROLE_ADMIN' });

    expect(service.isLoggedIn()()).toBe(true);
    expect(service.isAdmin()()).toBe(true);
  });

  it('should leave a non-admin login without the admin flag', () => {
    const service = setup();
    service.login('a@b.c', 'password123').subscribe();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ ...USER, role: 'ROLE_USER' });

    expect(service.isLoggedIn()()).toBe(true);
    expect(service.isAdmin()()).toBe(false);
  });

  it('should derive the admin flag on first register (no reload needed)', () => {
    const service = setup();
    service
      .register({ email: 'a@b.c', firstName: 'A', lastName: 'B', password: 'password123' })
      .subscribe();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ ...USER, role: 'ROLE_ADMIN' });

    expect(service.isLoggedIn()()).toBe(true);
    expect(service.isAdmin()()).toBe(true);
  });

  it('should drop the snapshot when revalidation fails with 401', () => {
    const service = setup({ 'dsa-drill-user': JSON.stringify(USER) });
    expect(service.isLoggedIn()()).toBe(true);

    service.loadCurrentUser().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/user`)
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.isLoggedIn()()).toBe(false);
    expect(memStore.has('dsa-drill-user')).toBe(false);
  });
});
