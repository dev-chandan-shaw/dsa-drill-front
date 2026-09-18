import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IProblemPattern } from '../../home/models/problem-pattern';
import { IProblemTag } from '../../home/models/question-tag';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { ToastService } from '../../../shared/services/toast-service';
import { SeoService } from '../../../shared/services/seo.service';
import { MarkdownView } from '../../../shared/components/markdown-view/markdown-view';
import { linkedQuestions, primaryTagId } from '../pattern-utils';
import { markdownExcerpt } from '../markdown-excerpt';

@Component({
  selector: 'app-pattern-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MarkdownView,
  ],
  templateUrl: './pattern-detail.html',
  styleUrl: './pattern-detail.scss',
})
export class PatternDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly questionTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly problemService = inject(PublicProblemService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  readonly tags = this.questionTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly problems = this.problemService.problems;
  readonly hasLoaded = computed(
    () =>
      this.problemPatternService.hasLoaded() &&
      this.questionTagService.hasLoaded() &&
      this.problemService.hasLoaded(),
  );
  readonly loadError = signal(false);
  readonly tagSlug = signal<string | null>(null);
  readonly patternId = signal<number | null>(null);
  readonly skeletonRows = Array.from({ length: 5 });

  readonly topic = computed<IProblemTag | null>(() => {
    const slug = this.tagSlug();
    return this.tags().find((tag) => tag.slug === slug) ?? null;
  });

  readonly pattern = computed<IProblemPattern | null>(() => {
    const id = this.patternId();
    return this.patterns().find((item) => item.id === id) ?? null;
  });

  readonly notFound = computed(
    () => this.hasLoaded() && (this.topic() === null || this.pattern() === null),
  );

  /** Canonical topic: the pattern's primary tag (stable for multi-tag duplicates). */
  readonly canonicalTopic = computed<IProblemTag | null>(() => {
    const pattern = this.pattern();
    if (!pattern) {
      return null;
    }
    const primary = primaryTagId(pattern);
    return this.tags().find((tag) => tag.id === primary) ?? this.topic();
  });

  readonly questionCount = computed(() => {
    const pattern = this.pattern();
    if (!pattern) {
      return 0;
    }
    return linkedQuestions(this.problems(), pattern.problemIds ?? []).length;
  });

  ngOnInit(): void {
    // Resolver preloads library data, so the first emission already carries
    // everything SSR needs for final meta tags (effects can't do this —
    // they never run on the server).
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.tagSlug.set(params.get('tagSlug'));
      const rawId = Number(params.get('patternId'));
      this.patternId.set(Number.isInteger(rawId) ? rawId : null);
      this.applyMeta();
      this.load();
    });
  }

  retry(): void {
    this.load();
  }

  getTagSlugById(tagId: number): string | null {
    return this.tags().find((tag) => tag.id === tagId)?.slug ?? null;
  }

  getTagNameById(tagId: number): string {
    return this.tags().find((tag) => tag.id === tagId)?.name ?? `Tag #${tagId}`;
  }

  private applyMeta(): void {
    const pattern = this.pattern();
    if (!pattern) {
      if (this.hasLoaded()) {
        this.seoService.setPageMeta({
          title: 'Pattern not found - DSA Drill',
          description: 'The requested question pattern does not exist.',
          path: '/question-pattern',
          robots: 'noindex,follow',
        });
      }
      return;
    }
    const canonical = this.canonicalTopic();
    const canonicalPath = canonical
      ? `/question-pattern/${canonical.slug}/${pattern.id}`
      : `/question-pattern`;
    this.seoService.setPageMeta({
      title: `${pattern.name} Pattern - DSA Drill`,
      description: markdownExcerpt(pattern.explanation, 155) || `Learn the ${pattern.name} pattern.`,
      path: canonicalPath,
    });
  }

  private load(): void {
    this.loadError.set(false);
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.fail('Unable to load'), next: () => this.applyMeta() });
    this.problemPatternService
      .fetchProblemPatterns()
      .subscribe({ error: () => this.fail('Unable to load'), next: () => this.applyMeta() });
    this.problemService.fetchProblems().subscribe({ error: () => this.fail('Unable to load') });
  }

  private fail(message: string): void {
    this.loadError.set(true);
    this.toastService.showError(message);
  }
}
