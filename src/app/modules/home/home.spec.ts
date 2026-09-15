import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransferState } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../core/services/storage.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemStatusApiService } from './services/user/question-status-api.service';

import { Home } from './home';
import { ProblemDifficulty } from './models/Question';

const SNAPSHOT_KEY = 'dsa-drill-user';
const PROBLEMS_URL = `${environment.apiUrl}/public/problems`;
const TAGS_URL = `${environment.apiUrl}/public/problem-tags`;
const AUTH_URL = `${environment.apiUrl}/auth/user`;
const STATUSES_URL = `${environment.apiUrl}/user-problem-status`;

const USER = {
  id: 9,
  email: 'g@example.com',
  firstName: 'G',
  lastName: 'User',
  role: 'ROLE_USER',
};

const TAGS = [{ id: 1, name: 'Array', slug: 'array', problemCount: 2 }];

const PROBLEMS = [
  {
    id: 1,
    title: 'Two Sum',
    link: 'https://example.com/a',
    difficulty: ProblemDifficulty.Easy,
    tags: [1],
  },
];

function createMemoryStorage(seed: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(seed));
  const stub = {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => void data.set(key, value),
    remove: (key: string) => void data.delete(key),
  } as StorageService;
  return { stub, data };
}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  async function setup(seed: Record<string, string> = {}): Promise<void> {
    const memory = createMemoryStorage(seed);
    TestBed.configureTestingModule({
      imports: [Home, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: memory.stub },
        { provide: TransferState, useFactory: () => new TransferState() },
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
    // Required once Home uses @defer blocks (incremental hydration):
    // deferrable views have external compilation metadata.
    await TestBed.compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
    httpMock.expectNone(PROBLEMS_URL);
  });

  it('should fetch statuses after auth resolves on a cold boot (no snapshot)', async () => {
    await setup();
    fixture.detectChanges();

    // Init wave: public data + auth revalidation, but no statuses yet.
    httpMock.expectOne(PROBLEMS_URL).flush(PROBLEMS);
    httpMock.expectOne(TAGS_URL).flush(TAGS);
    httpMock.expectNone(STATUSES_URL);

    // Auth resolves with a user: exactly one statuses fetch follows.
    httpMock.expectOne(AUTH_URL).flush(USER);
    httpMock.expectOne(STATUSES_URL).flush([{ problemId: 1, solved: true }]);

    const statuses = TestBed.inject(ProblemStatusApiService).problemStatuses();
    expect(statuses[1]?.solved).toBe(true);
    expect(component.hasLoaded()).toBe(true);
  });

  it('should never fetch statuses when auth resolves logged-out', async () => {
    await setup();
    fixture.detectChanges();

    httpMock.expectOne(PROBLEMS_URL).flush(PROBLEMS);
    httpMock.expectOne(TAGS_URL).flush(TAGS);
    httpMock.expectOne(AUTH_URL).flush('unauthorized', {
      status: 401,
      statusText: 'Unauthorized',
    });

    httpMock.expectNone(STATUSES_URL);
    expect(component.hasLoaded()).toBe(true);
    expect(TestBed.inject(AuthService).isLoggedIn()()).toBe(false);
  });

  it('should fetch statuses in the init wave on a warm boot (snapshot present)', async () => {
    await setup({ [SNAPSHOT_KEY]: JSON.stringify(USER) });
    fixture.detectChanges();

    httpMock.expectOne(PROBLEMS_URL).flush(PROBLEMS);
    httpMock.expectOne(TAGS_URL).flush(TAGS);
    // Snapshot hydrates instantly, but statuses still ride auth resolution.
    httpMock.expectOne(AUTH_URL).flush(USER);
    httpMock.expectOne(STATUSES_URL).flush([{ problemId: 1, revision: true }]);

    const statuses = TestBed.inject(ProblemStatusApiService).problemStatuses();
    expect(statuses[1]?.revision).toBe(true);
  });
});
