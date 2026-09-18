import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IProblem, ProblemDifficulty } from '../../home/models/Question';
import { IProblemPattern } from '../../home/models/problem-pattern';
import { IProblemTag } from '../../home/models/question-tag';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { ProblemStatusApiService } from '../../home/services/user/question-status-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastService } from '../../../shared/services/toast-service';
import { SeoService } from '../../../shared/services/seo.service';
import { ProblemList } from '../../../shared/components/problem-list/problem-list';
import { SheetSummaryCard } from '../../../shared/components/sheet-summary-card/sheet-summary-card';
import { linkedQuestions, primaryTagId } from '../pattern-utils';

@Component({
  selector: 'app-pattern-questions',
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    ProblemList,
    SheetSummaryCard,
  ],
  templateUrl: './pattern-questions.html',
  styleUrl: './pattern-questions.scss',
})
export class PatternQuestions implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tagService = inject(ProblemTagService);
  private readonly patternService = inject(ProblemPatternService);
  private readonly questionService = inject(PublicProblemService);
  private readonly statusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  readonly tags = this.tagService.problemTags;
  readonly patterns = this.patternService.problemPatterns;
  readonly problemStatuses = this.statusService.problemStatuses;

  readonly tagSlug = signal<string | null>(null);
  readonly patternId = signal<number | null>(null);
  readonly isSheetLoading = signal(true);
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 6 });

  readonly topic = computed<IProblemTag | null>(() => {
    const slug = this.tagSlug();
    return this.tags().find((tag) => tag.slug === slug) ?? null;
  });

  readonly pattern = computed<IProblemPattern | null>(() => {
    const id = this.patternId();
    return this.patterns().find((item) => item.id === id) ?? null;
  });

  readonly notFound = computed(
    () =>
      this.hasLoaded() && !this.isSheetLoading() && (this.topic() === null || this.pattern() === null),
  );

  readonly problems = computed<IProblem[]>(() => {
    const pattern = this.pattern();
    if (!pattern) {
      return [];
    }
    return linkedQuestions(this.questionService.problems(), pattern.problemIds ?? []);
  });

  readonly hasLoaded = computed(
    () =>
      this.patternService.hasLoaded() &&
      this.tagService.hasLoaded() &&
      this.questionService.hasLoaded(),
  );

  readonly totalCount = computed(() => this.problems().length);
  readonly easyCount = computed(
    () => this.problems().filter((p) => p.difficulty === ProblemDifficulty.Easy).length,
  );
  readonly mediumCount = computed(
    () => this.problems().filter((p) => p.difficulty === ProblemDifficulty.Medium).length,
  );
  readonly hardCount = computed(
    () => this.problems().filter((p) => p.difficulty === ProblemDifficulty.Hard).length,
  );
  readonly solvedCount = computed(() => {
    const statuses = this.problemStatuses();
    return this.problems().filter((p) => statuses[p.id]?.solved).length;
  });
  readonly solvedEasyCount = computed(() => {
    const statuses = this.problemStatuses();
    return this.problems().filter(
      (p) => p.difficulty === ProblemDifficulty.Easy && statuses[p.id]?.solved,
    ).length;
  });
  readonly solvedMediumCount = computed(() => {
    const statuses = this.problemStatuses();
    return this.problems().filter(
      (p) => p.difficulty === ProblemDifficulty.Medium && statuses[p.id]?.solved,
    ).length;
  });
  readonly solvedHardCount = computed(() => {
    const statuses = this.problemStatuses();
    return this.problems().filter(
      (p) => p.difficulty === ProblemDifficulty.Hard && statuses[p.id]?.solved,
    ).length;
  });
  readonly solvedPercent = computed(() => {
    const total = this.totalCount();
    if (!total) {
      return 0;
    }
    return Math.round((this.solvedCount() / total) * 100);
  });

  private readonly hasFetchedStatuses = signal(false);
  private readonly loadStatusesEffect = effect(() => {
    if (!this.authService.getAuthResolved()() || this.hasFetchedStatuses()) {
      return;
    }
    if (this.authService.getLoggedInUser()()) {
      this.hasFetchedStatuses.set(true);
      this.statusService.fetchProblemStatuses().subscribe();
    }
  });

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.tagSlug.set(params.get('tagSlug'));
      const rawId = Number(params.get('patternId'));
      this.patternId.set(Number.isInteger(rawId) ? rawId : null);
      this.applyMeta();
      this.load();
    });
  }

  retry() {
    this.load();
  }

  private canonicalPath(): string {
    const pattern = this.pattern();
    if (!pattern) {
      return '/question-pattern';
    }
    const primary = primaryTagId(pattern);
    const slug = this.tags().find((tag) => tag.id === primary)?.slug ?? this.tagSlug();
    return `/question-pattern/${slug}/${pattern.id}/questions`;
  }

  private applyMeta(): void {
    const pattern = this.pattern();
    if (!pattern) {
      if (this.hasLoaded()) {
        this.seoService.setPageMeta({
          title: 'Pattern questions not found - DSA Drill',
          description: 'The requested practice set does not exist.',
          path: '/question-pattern',
          robots: 'noindex,follow',
        });
      }
      return;
    }
    this.seoService.setPageMeta({
      title: `${pattern.name} Practice Questions - DSA Drill`,
      description: `Practice ${pattern.name} DSA questions with progress tracking, notes and revision marks.`,
      path: this.canonicalPath(),
    });
  }

  private load() {
    this.loadError.set(false);
    this.isSheetLoading.set(true);
    this.tagService.fetchProblemTags().subscribe({
      error: () => this.fail(),
      next: () => this.applyMeta(),
    });
    this.patternService.fetchProblemPatterns().subscribe({
      error: () => this.fail(),
      next: () => {
        this.applyMeta();
        this.isSheetLoading.set(false);
      },
    });
    this.questionService.fetchProblems().subscribe({ error: () => this.fail() });
  }

  private fail() {
    this.loadError.set(true);
    this.isSheetLoading.set(false);
    this.toastService.showError('Unable to load this practice set');
  }
}
