import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ReaderState, Item } from './reader-state';

describe('Reader state', () => {
  const base = `${environment.apiUrl}/user/library`;
  const item: Item = { type: 'DESIGN', id: '6', title: 'Parking Lot' };
  const url = `${base}/items/DESIGN/6`;
  let service: ReaderState;
  let http: HttpTestingController;
  const user = signal<{ id: number } | null>(null);
  beforeEach(() => {
    TestBed.resetTestingModule();
    user.set({ id: 1 });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getAuthResolved: () => signal(true),
            getLoggedInUser: () => user,
            ensureLoggedIn: () => of(!!user()),
          },
        },
      ],
    });
    service = TestBed.inject(ReaderState);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne(`${base}/saved-problems`).flush([]);
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  async function open() {
    const opening = service.open(item);
    await settle();
    const read = http.expectOne(url);
    expect(read.request.transferCache).toBe(false);
    read.flush({ note: 'Existing note', savedAt: null, noteUpdatedAt: null });
    await opening;
  }
  it('uses independent bookmark and note requests and flushes on close', async () => {
    await open();
    service.edit('Revised note');
    const saving = service.bookmark(item, true);
    const closing = service.close();
    await settle();
    const bookmark = http.expectOne(`${url}/bookmark`);
    expect(bookmark.request.method).toBe('PUT');
    bookmark.flush(null);
    const note = http.expectOne(`${url}/note`);
    expect(note.request.body).toEqual({ note: 'Revised note' });
    note.flush(null);
    await saving;
    expect(await closing).toBe(true);
    expect(service.editor()).toBeNull();
  });
  it('keeps the draft open when saving fails', async () => {
    await open();
    service.edit('Unsaved note');
    const closing = service.close();
    await settle();
    http.expectOne(`${url}/note`).flush(null, { status: 500, statusText: 'Error' });
    expect(await closing).toBe(false);
    expect(service.status()).toBe('Failed');
    expect(service.text()).toBe('Unsaved note');
  });
  it('reopens a loaded note without another request or loading state', async () => {
    await open();
    await service.close();
    const reopening = service.open(item);
    expect(service.loading()).toBe(false);
    await reopening;
    http.expectNone(url);
    expect(service.text()).toBe('Existing note');
  });
  it('deduplicates simultaneous state requests', () => {
    service.state(item).subscribe();
    service.state(item).subscribe();
    http.expectOne(url).flush({ note: 'Shared note' });
    service.state(item).subscribe((state) => expect(state.note).toBe('Shared note'));
    http.expectNone(url);
  });
  it('keeps saved edits and deletions in the cache', async () => {
    await open();
    for (const value of ['Updated note', '']) {
      service.edit(value);
      const saving = service.flush();
      await settle();
      const request = http.expectOne(`${url}/note`);
      expect(request.request.method).toBe(value ? 'PUT' : 'DELETE');
      request.flush(null);
      await saving;
      await service.close();
      await service.open(item);
      http.expectNone(url);
      expect(service.text()).toBe(value);
    }
  });
  it('fetches the note again after the account changes', async () => {
    await open();
    user.set({ id: 2 });
    TestBed.tick();
    http.expectOne(`${base}/saved-problems`).flush([]);
    await open();
  });
  it('opens the pane immediately and shows loading until the note arrives', async () => {
    const opening = service.open(item);
    expect(service.paneItem()).toEqual(item);
    expect(service.loading()).toBe(true);
    await settle();
    http.expectOne(url).flush({ note: 'Loaded note' });
    await opening;
    expect(service.loading()).toBe(false);
    expect(service.text()).toBe('Loaded note');
  });
  it('keeps load failures in the pane and allows retrying', async () => {
    const opening = service.open(item);
    const failed = opening.catch(() => {});
    await settle();
    http.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
    await failed;
    expect(service.paneItem()).toEqual(item);
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    await open();
    expect(service.loadError()).toBe(false);
  });
  it('does not reopen a pane closed while its note is loading', async () => {
    const opening = service.open(item);
    await settle();
    const request = http.expectOne(url);
    await service.close();
    request.flush({ note: 'Late note' });
    await opening;
    expect(service.paneItem()).toBeNull();
    expect(service.loading()).toBe(false);
  });
  it('filters design notes by level before pagination', () => {
    service.feed(true, 'LLD', 30).subscribe();
    const request = http.expectOne((r) => r.url === `${base}/notes`);
    expect(request.request.params.get('type')).toBe('DESIGN');
    expect(request.request.params.get('level')).toBe('LLD');
    expect(request.request.params.get('offset')).toBe('30');
    request.flush([]);
  });
  it('caches each notes/saved tab and pagination independently', () => {
    service.feed(true, 'Questions', 0).subscribe();
    http.expectOne((r) => r.url === `${base}/notes`).flush([]);
    service.feed(false, 'Questions', 0).subscribe();
    http.expectOne((r) => r.url === `${base}/saved`).flush([]);
    service.feed(true, 'Questions', 30).subscribe();
    http.expectOne((r) => r.url === `${base}/notes`).flush([]);
    service.feed(true, 'Questions', 0).subscribe();
    service.feed(false, 'Questions', 0).subscribe();
    service.feed(true, 'Questions', 30).subscribe();
    http.expectNone((r) => r.url === `${base}/notes` || r.url === `${base}/saved`);
    service.rememberFeed(true, 'Questions', [], true);
    expect(service.feedSnapshot(true, 'Questions')).toEqual({ entries: [], more: true });
  });
  it('allows retrying failed feeds', () => {
    service.feed(true, 'Questions', 0).subscribe({ error: () => {} });
    http.expectOne((r) => r.url === `${base}/notes`)
      .flush(null, { status: 500, statusText: 'Error' });
    service.feed(true, 'Questions', 0).subscribe();
    http.expectOne((r) => r.url === `${base}/notes`).flush([]);
  });
  it('clears feed caches and snapshots on account changes', () => {
    service.feed(true, 'Questions', 0).subscribe();
    http.expectOne((r) => r.url === `${base}/notes`).flush([]);
    service.rememberFeed(true, 'Questions', [], false);
    user.set({ id: 2 });
    TestBed.tick();
    http.expectOne(`${base}/saved-problems`).flush([]);
    expect(service.feedSnapshot(true, 'Questions')).toBeUndefined();
    service.feed(true, 'Questions', 0).subscribe();
    http.expectOne((r) => r.url === `${base}/notes`).flush([]);
  });

  it('clears open notes and bookmark state when the account changes', async () => {
    await open();
    const question: Item = {type:'PROBLEM',id:'4',title:'Two Sum'};
    const saving=service.bookmark(question,true);
    await settle();
    http.expectOne(`${base}/items/PROBLEM/4/bookmark`).flush(null);
    await saving;
    expect(service.bookmarks().has(4)).toBe(true);

    user.set({id:2});
    TestBed.tick();
    http.expectOne(`${base}/saved-problems`).flush([8]);
    expect([...service.bookmarks()]).toEqual([8]);
    expect(service.editor()).toBeNull();
    expect(service.text()).toBe('');
  });
});
