import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransferState } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { PublicProblemService } from './problem.service';
import { IProblem, ProblemDifficulty } from '../../../modules/home/models/Question';

const API = `${environment.apiUrl}/public/problems`;

const LIST_A: IProblem[] = [
  {
    id: 1,
    title: 'Two Sum',
    link: 'https://example.com/two-sum',
    difficulty: ProblemDifficulty.Easy,
    tags: [1],
  },
];

const LIST_B: IProblem[] = [
  ...LIST_A,
  {
    id: 2,
    title: 'Add Two Numbers',
    link: 'https://example.com/add-two-numbers',
    difficulty: ProblemDifficulty.Medium,
    tags: [1],
  },
];

function createTransferStateStub() {
  const data = new Map<unknown, unknown>();
  const api = {
    get: (key: unknown, fallback: unknown) =>
      data.has(key) ? data.get(key) : fallback,
    set: (key: unknown, value: unknown) => {
      data.set(key, value);
    },
    remove: (key: unknown) => {
      data.delete(key);
    },
  };
  return { api, data };
}

describe('PublicProblemService freshness', () => {
  let service: PublicProblemService;
  let httpMock: HttpTestingController;

  function setup(): void {
    const store = createTransferStateStub();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransferState, useValue: store.api },
      ],
    });
    service = TestBed.inject(PublicProblemService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should serve cached data synchronously without HTTP once loaded', () => {
    setup();
    service.fetchProblems().subscribe();
    httpMock.expectOne(API).flush(LIST_A);

    let second: IProblem[] | null = null;
    service.fetchProblems().subscribe((res) => (second = res));

    httpMock.expectNone(API);
    expect(second).toEqual(LIST_A);
    expect(service.hasLoaded()).toBe(true);
  });

  it('should patch the signal in the background without resetting hasLoaded', () => {
    setup();
    service.fetchProblems().subscribe();
    httpMock.expectOne(API).flush(LIST_A);
    expect(service.hasLoaded()).toBe(true);

    service.refreshProblemsInBackground();

    httpMock.expectOne(API).flush(LIST_B);
    expect(service.problems()).toEqual(LIST_B);
    // Template gate never toggles: no skeleton flash on silent updates.
    expect(service.hasLoaded()).toBe(true);
  });

  it('should fire exactly one background request per call', () => {
    setup();
    service.fetchProblems().subscribe();
    httpMock.expectOne(API).flush(LIST_A);

    service.refreshProblemsInBackground();
    service.refreshProblemsInBackground();

    const pending = httpMock.match(API);
    expect(pending.length).toBe(2);
    pending.forEach((req) => req.flush(LIST_B));
    expect(service.problems()).toEqual(LIST_B);
  });

  it('should no-op the background refresh when nothing is loaded yet', () => {
    setup();

    service.refreshProblemsInBackground();

    httpMock.expectNone(API);
    expect(service.hasLoaded()).toBe(false);
    expect(service.problems()).toEqual([]);
  });

  it('should bypass the snapshot on forced reload', () => {
    setup();
    service.fetchProblems().subscribe();
    httpMock.expectOne(API).flush(LIST_A);

    let reloaded: IProblem[] | null = null;
    service.fetchProblems(true).subscribe((res) => (reloaded = res));

    httpMock.expectOne(API).flush(LIST_B);
    expect(reloaded).toEqual(LIST_B);
  });

  it('should keep showing the snapshot when the background refresh fails', () => {
    setup();
    service.fetchProblems().subscribe();
    httpMock.expectOne(API).flush(LIST_A);

    service.refreshProblemsInBackground();
    httpMock.expectOne(API).flush('error', { status: 500, statusText: 'Error' });

    expect(service.problems()).toEqual(LIST_A);
    expect(service.hasLoaded()).toBe(true);
  });
});
