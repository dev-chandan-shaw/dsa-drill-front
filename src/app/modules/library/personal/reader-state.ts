import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ProblemStatusApiService } from '../../home/services/user/question-status-api.service';

export type ItemType = 'PROBLEM' | 'SHEET' | 'PATTERN' | 'DESIGN';
export interface Item {
  type: ItemType;
  id: string;
  title: string;
}
export interface State {
  savedAt: string | null;
  note: string | null;
  noteUpdatedAt: string | null;
}
export interface Entry extends Item {
  path: string;
  updatedAt: string | null;
  note: string | null;
}
export type Tab = 'Questions' | 'Patterns' | 'Sheets' | 'HLD' | 'LLD';
const types: Record<Tab, ItemType> = {
  Questions: 'PROBLEM',
  Patterns: 'PATTERN',
  Sheets: 'SHEET',
  HLD: 'DESIGN',
  LLD: 'DESIGN',
};

@Injectable({ providedIn: 'root' })
export class ReaderState {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private progress = inject(ProblemStatusApiService);
  private base = `${environment.apiUrl}/user/library`;
  readonly user = this.auth.getLoggedInUser();
  private readonly ownerId = computed(() => this.user()?.id);
  readonly resolved = this.auth.getAuthResolved();
  readonly changed = signal<{
    item: Item;
    field: 'note' | 'bookmark';
    value: string | null;
  } | null>(null);
  readonly bookmarks = signal<ReadonlySet<number>>(new Set());
  readonly editor = signal<Item | null>(null);
  readonly opening = signal<Item | null>(null);
  readonly paneItem = computed(() => this.opening() ?? this.editor());
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly text = signal('');
  readonly status = signal<'Saved' | 'Saving' | 'Failed'>('Saved');
  private persisted = '';
  private timer?: ReturnType<typeof setTimeout>;
  private chain: Promise<boolean> = Promise.resolve(true);
  private epoch = 0;
  private openRequest = 0;
  private readonly states = new Map<string, State>();
  private readonly stateRequests = new Map<string, Observable<State>>();
  private readonly feeds = new Map<string, Observable<Entry[]>>();
  private readonly feedSnapshots = new Map<string, { entries: Entry[]; more: boolean }>();
  private feedKey(notes: boolean, tab: Tab) {
    return `${notes ? 'notes' : 'saved'}/${tab}`;
  }
  feedSnapshot(notes: boolean, tab: Tab) {
    return this.feedSnapshots.get(this.feedKey(notes, tab));
  }
  rememberFeed(notes: boolean, tab: Tab, entries: Entry[], more: boolean) {
    this.feedSnapshots.set(this.feedKey(notes, tab), { entries, more });
  }
  private invalidateFeeds(notes: boolean, item: Item) {
    for (const tab of Object.keys(types) as Tab[]) {
      if (types[tab] !== item.type) continue;
      const key = this.feedKey(notes, tab);
      this.feedSnapshots.delete(key);
      for (const page of this.feeds.keys()) {
        if (page.startsWith(`${key}/`)) this.feeds.delete(page);
      }
    }
  }
  constructor() {
    effect((cleanup) => {
      const owner = this.ownerId(),
        ready = this.resolved();
      untracked(() => {
        this.reset();
        this.bookmarks.set(new Set());
        this.changed.set(null);
        this.bookmarkEdits.clear();
        this.states.clear();
        this.stateRequests.clear();
        this.feeds.clear();
        this.feedSnapshots.clear();
      });
      if (owner != null && ready) {
        const sub = this.http
          .get<number[]>(`${this.base}/saved-problems`, { transferCache: false })
          .subscribe({
            next: (ids) => {
              const state = new Set(ids);
              for (const [id, saved] of this.bookmarkEdits) {
                if (saved) state.add(id);
                else state.delete(id);
              }
              this.bookmarks.set(state);
            },
            error: () => {},
          });
        cleanup(() => sub.unsubscribe());
      }
    });
  }
  private readonly bookmarkEdits = new Map<number, boolean>();
  private url(item: Item) {
    return `${this.base}/items/${item.type}/${encodeURIComponent(item.id)}`;
  }
  state(item: Item) {
    const key = this.url(item);
    const cached = this.states.get(key);
    if (cached) return of(cached);
    const pending = this.stateRequests.get(key);
    if (pending) return pending;
    const owner = this.user()?.id;
    const request = this.http.get<State>(key, { transferCache: false }).pipe(
      tap((state) => {
        if (owner === this.user()?.id) this.states.set(key, state);
      }),
      finalize(() => {
        if (this.stateRequests.get(key) === request) this.stateRequests.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.stateRequests.set(key, request);
    return request;
  }
  feed(notes: boolean, tab: Tab, offset: number, refresh = false) {
    const key = `${this.feedKey(notes, tab)}/${offset}`;
    if (refresh) {
      this.feeds.delete(key);
      this.feedSnapshots.delete(this.feedKey(notes, tab));
    }
    const cached = this.feeds.get(key);
    if (cached) return cached;
    const request = this.http.get<Entry[]>(`${this.base}/${notes ? 'notes' : 'saved'}`, {
      transferCache: false,
      params: {
        type: types[tab],
        ...(tab === 'HLD' || tab === 'LLD' ? { level: tab } : {}),
        offset,
        limit: 30,
      },
    }).pipe(
      tap({ error: () => {
        if (this.feeds.get(key) === request) this.feeds.delete(key);
      } }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.feeds.set(key, request);
    return request;
  }
  async bookmark(item: Item, saved: boolean) {
    if (!(await firstValueFrom(this.auth.ensureLoggedIn()))) return;
    const owner = this.user()?.id,
      url = `${this.url(item)}/bookmark`;
    await firstValueFrom(saved ? this.http.put<void>(url, {}) : this.http.delete<void>(url));
    if (owner !== this.user()?.id) return;
    if (item.type === 'PROBLEM') {
      this.bookmarkEdits.set(+item.id, saved);
      this.bookmarks.update((current) => {
        const ids = new Set(current);
        if (saved) ids.add(+item.id);
        else ids.delete(+item.id);
        return ids;
      });
    }
    const savedAt = saved ? new Date().toISOString() : null;
    const cached = this.states.get(this.url(item));
    if (cached) this.states.set(this.url(item), { ...cached, savedAt });
    this.invalidateFeeds(false, item);
    this.changed.set({ item, field: 'bookmark', value: savedAt });
  }
  async open(item: Item) {
    if (!this.opening() && this.editor()?.id === item.id && this.editor()?.type === item.type) return;
    const request = ++this.openRequest;
    if (this.user()) {
      this.opening.set(item);
      this.loading.set(!this.states.has(this.url(item)));
      this.loadError.set(false);
    }
    if (!(await firstValueFrom(this.auth.ensureLoggedIn()))) {
      if (request === this.openRequest) this.reset();
      return;
    }
    const owner = this.user()?.id;
    if (!(await this.flush())) {
      if (request === this.openRequest) {
        this.opening.set(null);
        this.loading.set(false);
      }
      return;
    }
    if (request !== this.openRequest) return;
    this.opening.set(item);
    this.loading.set(!this.states.has(this.url(item)));
    this.loadError.set(false);
    try {
      const state = await firstValueFrom(this.state(item));
      if (request !== this.openRequest || owner !== this.user()?.id) return;
      if (this.pending() && !(await this.flush())) return;
      if (request !== this.openRequest || owner !== this.user()?.id || this.pending()) return;
      this.epoch++;
      this.persisted = state.note ?? '';
      this.text.set(this.persisted);
      this.status.set('Saved');
      this.editor.set(item);
      this.opening.set(null);
    } catch (error) {
      if (request === this.openRequest) this.loadError.set(true);
      throw error;
    } finally {
      if (request === this.openRequest) this.loading.set(false);
    }
  }
  edit(value: string) {
    if (this.opening() || !this.editor() || value === this.text()) return;
    this.text.set(value);
    this.status.set('Saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 600);
  }
  pending() {
    return !!this.editor() && this.text() !== this.persisted;
  }
  flush(): Promise<boolean> {
    clearTimeout(this.timer);
    const epoch = this.epoch;
    this.chain = this.chain.then(async () => {
      const item = this.editor(),
        value = this.text();
      if (epoch !== this.epoch || !item) return true;
      if (!this.pending()) {
        this.status.set('Saved');
        return true;
      }
      this.status.set('Saving');
      try {
        const url = `${this.url(item)}/note`;
        await firstValueFrom(
          value.trim() ? this.http.put<void>(url, { note: value }) : this.http.delete<void>(url),
        );
        if (epoch !== this.epoch) return true;
        this.persisted = value;
        this.invalidateFeeds(true, item);
        const key = this.url(item);
        const cached = this.states.get(key);
        if (cached) this.states.set(key, {
          ...cached,
          note: value.trim() ? value : null,
          noteUpdatedAt: new Date().toISOString(),
        });
        if (item.type === 'PROBLEM')
          this.progress.cacheNote(+item.id, value.trim() ? value : undefined);
        this.changed.set({ item, field: 'note', value: value.trim() ? value : null });
        this.status.set(this.pending() ? 'Saving' : 'Saved');
        return true;
      } catch {
        if (epoch === this.epoch) this.status.set('Failed');
        return false;
      }
    });
    return this.chain;
  }
  async close() {
    ++this.openRequest;
    if (!(await this.flush()) || this.pending()) return false;
    this.reset();
    return true;
  }
  discardFailedEdit() {
    if (this.status() === 'Failed') this.reset();
  }
  private reset() {
    clearTimeout(this.timer);
    this.epoch++;
    this.openRequest++;
    this.editor.set(null);
    this.opening.set(null);
    this.loading.set(false);
    this.loadError.set(false);
    this.persisted = '';
    this.text.set('');
    this.status.set('Saved');
  }
}
