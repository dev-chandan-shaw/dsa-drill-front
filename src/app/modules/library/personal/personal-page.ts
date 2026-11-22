import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Entry, ReaderState, Tab } from './reader-state';
import { SeoService } from '../../../shared/services/seo.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-personal-page',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  styleUrls: ['../library.scss', '../library-list.scss'],
  template: `<section class="library-shell subject-shell">
    <header class="library-head">
      <h1>{{ notes ? 'My Notes' : 'Saved' }}</h1>
      <p>{{ notes ? 'Your ideas and takeaways, ready to revisit.' : 'Pick up where you left off.' }}</p>
    </header>
    <nav class="section-tabs" aria-label="Content type">
      @for (t of tabs; track t) {
        <a
          [routerLink]="[]"
          [queryParams]="{ tab: t }"
          [attr.aria-current]="tab() === t ? 'page' : null"
          >{{ t }}</a
        >
      }
    </nav>
    <div class="collection-toolbar">
      <span class="item-count">{{ entries().length }}{{ more() ? '+' : '' }} {{ notes ? 'notes' : 'saved items' }}</span>
      <label class="collection-search">
        <mat-icon aria-hidden="true">search</mat-icon>
        <input type="search" [value]="search()" (input)="search.set($any($event.target).value)"
          [placeholder]="notes ? 'Search notes' : 'Search saved items'"
          [attr.aria-label]="notes ? 'Search notes' : 'Search saved items'" />
      </label>
    </div>
    <div [class.shaded-list]="visibleEntries().length > 0">
    @for (entry of visibleEntries(); track entry.type + ':' + entry.id) {
      <article class="entry-row shaded-row">
        <mat-icon class="entry-icon" aria-hidden="true">{{ notes ? 'description' : 'bookmark_border' }}</mat-icon>
        <div class="entry-copy">
        @if (notes) {
          <button class="note-link" type="button" (click)="open(entry)">
            <span class="entry-title">{{ entry.title }}</span>
            @if (entry.note) { <span class="note-preview">{{ entry.note }}</span> }
          </button>
        } @else {
          @if (entry.type === 'PROBLEM') {
            <a class="entry-title" [href]="entry.path" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a>
          } @else {
            <a class="entry-title" [routerLink]="entry.path">{{ entry.title }}</a>
          }
          @if (entry.note) { <p class="note-preview">{{ entry.note }}</p> }
        }
        <div class="entry-meta">
          <span>{{ itemLabel() }}</span>
          @if (entry.updatedAt) { <span>{{ notes ? 'Updated' : 'Saved' }} {{ entry.updatedAt | date: 'MMM d, y' }}</span> }
          @if (!notes && entry.note) { <span>Has a note</span> }
        </div>
        </div>
        <div class="entry-actions">
          <button mat-icon-button type="button" (click)="open(entry)"
            [matTooltip]="entry.note ? 'Open note' : 'Add note'"
            [attr.aria-label]="(entry.note ? 'Open note for ' : 'Add note to ') + entry.title">
            <mat-icon>{{ entry.note ? 'edit_note' : 'note_add' }}</mat-icon>
          </button>
          @if (!notes && entry.type === 'PROBLEM') {
            <a mat-icon-button [href]="entry.path" target="_blank" rel="noopener noreferrer"
              matTooltip="Open practice question" [attr.aria-label]="'Open practice question: ' + entry.title"><mat-icon>open_in_new</mat-icon></a>
          } @else {
            <a mat-icon-button [routerLink]="entry.path" matTooltip="Open item" [attr.aria-label]="'Open ' + entry.title"><mat-icon>arrow_forward</mat-icon></a>
          }
        </div>
      </article>
    } @empty {
      @if (!loading() && !error()) {
        <div class="empty-collection">
          <mat-icon aria-hidden="true">{{ search() ? 'search_off' : notes ? 'note_add' : 'bookmark_add' }}</mat-icon>
          <h2>{{ search() ? 'No matching items' : 'Nothing here yet' }}</h2>
          <p>{{ search() ? 'Try another title or a word from your notes.' : notes ? 'Add a note to a question or article to keep your takeaways here.' : 'Save questions, articles, and sheets to find them here later.' }}</p>
          @if (!search()) { <a class="browse-link" [routerLink]="browsePath()">Explore {{ tab() }}</a> }
        </div>
      }
    }
    </div>
    @if (loading()) {
      <p role="status">Loading…</p>
    }
    @if (error()) {
      <p role="alert">
        {{ error() }} <button mat-icon-button matTooltip="Retry loading" aria-label="Retry loading" (click)="load(false, true)"><mat-icon>refresh</mat-icon></button>
      </p>
    }
    @if (more() && !loading()) {
      <button mat-icon-button matTooltip="Load more" aria-label="Load more" (click)="load(true)"><mat-icon>expand_more</mat-icon></button>
    }
  </section>`,
  styles: `
    .collection-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
    .item-count { font-size: 12px; color: var(--library-muted); white-space: nowrap; }
    .collection-search { display: flex; align-items: center; gap: 8px; width: min(55%, 260px); border: 1px solid var(--library-line); border-radius: 8px; padding: 7px 10px; color: var(--library-muted); }
    .collection-search:focus-within { outline: 2px solid var(--library-accent); outline-offset: 2px; }
    .collection-search mat-icon { width: 18px; height: 18px; font-size: 18px; flex-shrink: 0; }
    .collection-search input { width: 100%; min-width: 0; border: 0; outline: none; background: transparent; color: var(--library-ink); font: 13px system-ui, sans-serif; }
    .entry-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding-block: 18px;
    }
    .entry-icon { flex-shrink: 0; margin-top: 2px; color: var(--library-muted); font-size: 20px; }
    .entry-copy { flex: 1; min-width: 0; }
    .entry-actions { display: flex; flex-shrink: 0; }
    .note-link { display: block; width: 100%; border: 0; background: transparent; color: inherit; padding: 0; text-align: left; cursor: pointer; }
    .entry-title {
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
      text-decoration: none;
      overflow-wrap: anywhere;
      color: inherit;
    }
    .note-link:hover .entry-title, a.entry-title:hover { color: var(--library-accent); }
    .note-preview {
      margin: 6px 0 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      color: var(--library-muted);
      font: 13px/1.6 system-ui, sans-serif;
      overflow-wrap: anywhere;
    }
    .entry-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 12px;
      color: var(--library-muted);
      margin-top: 8px;
    }
    .empty-collection { margin-top: 20px; padding: 28px 20px; background: var(--library-soft); border-radius: 8px; }
    .empty-collection > mat-icon { color: var(--library-muted); }
    .empty-collection h2 { margin: 12px 0 6px; font: 600 18px/1.4 system-ui, sans-serif; }
    .empty-collection p { margin: 0; max-width: 52ch; color: var(--library-muted); font-size: 14px; line-height: 1.6; }
    .browse-link { display: inline-block; margin-top: 16px; color: var(--library-accent); text-underline-offset: 4px; font-size: 14px; }
    .note-link:focus-visible, .entry-title:focus-visible { outline: 2px solid var(--library-accent); outline-offset: 4px; }
    @media (max-width: 540px) {
      .entry-icon { display: none; }
      .entry-row { gap: 6px; }
      .entry-actions { flex-direction: column; }
    }
  `,
})
export class PersonalPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reader = inject(ReaderState);
  readonly notes = this.route.snapshot.data['notes'] === true;
  readonly tabs: Tab[] = ['Questions', 'Patterns', 'Sheets', 'HLD', 'LLD'];
  readonly tab = signal<Tab>('Questions');
  readonly entries = signal<Entry[]>([]);
  readonly search = signal('');
  readonly visibleEntries = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.entries().filter((entry) =>
      !query || `${entry.title} ${entry.note ?? ''}`.toLowerCase().includes(query));
  });
  readonly itemLabel = computed(() => ({
    Questions: 'Question', Patterns: 'Pattern', Sheets: 'Sheet', HLD: 'High-level design', LLD: 'Low-level design',
  })[this.tab()]);
  readonly browsePath = computed(() => ({
    Questions: '/library/dsa/questions', Patterns: '/library/dsa/patterns',
    Sheets: '/library/dsa/sheets', HLD: '/library/hld', LLD: '/library/lld',
  })[this.tab()]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly more = signal(false);
  private request?: Subscription;
  constructor() {
    inject(SeoService).setPageMeta({
      title: `${this.notes ? 'My Notes' : 'Saved'} - DSA Drill`,
      description: 'Your private DSA Drill library.',
      robots: 'noindex',
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const tab = p.get('tab') as Tab;
      this.tab.set(this.tabs.includes(tab) ? tab : 'Questions');
      this.search.set('');
    });
    effect(() => {
      this.tab();
      const ready = this.reader.resolved(),
        user = this.reader.user();
      this.request?.unsubscribe();
      this.entries.set([]);
      this.more.set(false);
      if (ready && user) untracked(() => {
        const cached = this.reader.feedSnapshot(this.notes, this.tab());
        this.error.set('');
        if (cached) {
          this.entries.set(cached.entries);
          this.more.set(cached.more);
          this.loading.set(false);
        } else this.load(false);
      });
      else if (ready)
        void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    });
    effect(() => {
      const change = this.reader.changed();
      if (!change || (this.notes ? 'note' : 'bookmark') !== change.field) return;
      this.entries.update((list) =>
        list
          .flatMap((e) =>
            e.type !== change.item.type || e.id !== change.item.id
              ? [e]
              : !change.value
                ? []
                : [
                    {
                      ...e,
                      note: this.notes ? change.value : e.note,
                      updatedAt: new Date().toISOString(),
                    },
                  ],
          )
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      );
    });
  }
  load(append: boolean, refresh = false) {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.reader
      .feed(this.notes, this.tab(), append ? this.entries().length : 0, refresh)
      .subscribe({
        next: (list) => {
          this.entries.set(append ? [...this.entries(), ...list] : list);
          this.more.set(list.length === 30);
          this.reader.rememberFeed(this.notes, this.tab(), this.entries(), this.more());
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load this list.');
          this.loading.set(false);
        },
      });
  }
  async open(entry: Entry) {
    try {
      await this.reader.open(entry);
    } catch (error) {
      if ((error as { status?: number })?.status === 404) this.load(false, true);
      else this.error.set('This note could not be opened.');
    }
  }
}
