import { Component, computed, DestroyRef, inject, OnInit, RESPONSE_INIT, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LibraryApi } from './library-api.service';
import { PatternEntry } from './library.models';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { IProblemTag } from '../home/models/question-tag';
import { SeoService } from '../../shared/services/seo.service';
import { ArticleListItem } from './article-list-item';
import { resolveTopicCover } from '../question-pattern/topic-covers';

@Component({
  selector: 'app-library-patterns',
  imports: [RouterLink, ArticleListItem],
  styleUrls: ['./library.scss', './library-patterns.scss'],
  template: `
    <section [class.library-shell]="topicSlug()" [class.subject-shell]="topicSlug()">
      @if (loading()) {
        <div class="library-loading"><p role="status">Loading patterns…</p></div>
      } @else if (error()) {
        <p role="alert">Could not load patterns. <button class="library-button" type="button" (click)="load()">Try again</button></p>
      } @else if (topicSlug()) {
        @if (topic(); as tag) {
          <header class="library-head pattern-topic-header"><h1>{{ tag.name }} patterns</h1></header>
          <div class="pattern-list">
            @for (pattern of topicPatterns(); track pattern.summary.id) {
              <app-article-list-item class="pattern-row" [article]="pattern.summary" />
            } @empty { <p>No published patterns in this topic yet. <a routerLink="/library/dsa/patterns">Browse other topics</a>.</p> }
          </div>
        } @else {
          <h1>Topic unavailable</h1><p>This question-tag topic does not exist.</p><a routerLink="/library/dsa/patterns">Browse topics</a>
        }
      } @else {
        <div class="pattern-topics">
          @for (entry of topics(); track entry.tag.id) {
            <a class="pattern-topic"
              [routerLink]="['/library/dsa/patterns/topics', entry.tag.slug]"
              [style.--cover-from]="entry.cover.from"
              [style.--cover-to]="entry.cover.to">
              <span class="pattern-topic-glyph" aria-hidden="true">{{ entry.cover.glyph }}</span>
              <div class="pattern-topic-copy">
                <h3>{{ entry.tag.name }}</h3>
                <span class="pattern-topic-count">{{ entry.count }} {{ entry.count === 1 ? 'pattern' : 'patterns' }}</span>
              </div>
            </a>
          } @empty { <p>No question tags yet. Topics will appear here when tags are added.</p> }
        </div>
      }
    </section>
  `,
})
export class LibraryPatterns implements OnInit {
  private readonly api = inject(LibraryApi);
  private readonly tagsApi = inject(ProblemTagService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly patterns = signal<PatternEntry[]>([]);
  readonly tags = signal<IProblemTag[]>([]);
  readonly topicSlug = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly topic = computed(() => this.tags().find((t) => t.slug === this.topicSlug()));
  readonly topicPatterns = computed(() => this.patterns().filter((p) => p.tagIds.includes(this.topic()?.id ?? -1)));
  readonly topics = computed(() => this.tags().map((tag) => ({
    tag, cover: resolveTopicCover(tag), count: this.patterns().filter((p) => p.tagIds.includes(tag.id)).length,
  })).sort((a, b) => a.tag.name.localeCompare(b.tag.name)));
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.topicSlug.set(params.get('topicSlug'));
      this.updateMeta();
    });
    this.load();
  }
  load() {
    const cached = this.api.cachedPatterns();
    const hasCachedData = cached !== null && this.tagsApi.hasLoaded();
    if (hasCachedData) {
      this.patterns.set(cached);
      this.tags.set(this.tagsApi.problemTags());
    }
    this.loading.set(!hasCachedData); this.error.set(false);
    if (hasCachedData) this.updateMeta();
    forkJoin({ patterns: this.api.patterns(), tags: this.tagsApi.fetchProblemTags() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ patterns, tags }) => {
          this.patterns.set(patterns); this.tags.set(tags); this.loading.set(false); this.updateMeta();
        },
        error: () => {
          this.loading.set(false);
          this.error.set(!hasCachedData);
          if (!hasCachedData && this.response) this.response.status = 503;
        },
      });
  }
  private updateMeta() {
    if (!this.topicSlug() || this.loading()) return;
    if (!this.topic() && this.response) this.response.status = 404;
    this.seo.setPageMeta({ title: `${this.topic()?.name ?? 'Topic unavailable'} patterns - DSA Drill`,
      description: 'Learn algorithmic patterns and practice related questions by topic.',
      path: `/library/dsa/patterns/topics/${this.topicSlug()}`, robots: this.topic() ? 'index,follow' : 'noindex' });
  }
}
