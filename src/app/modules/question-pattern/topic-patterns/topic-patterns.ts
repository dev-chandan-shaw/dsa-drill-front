import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IProblemPattern } from '../../home/models/problem-pattern';
import { IProblemTag } from '../../home/models/question-tag';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { ToastService } from '../../../shared/services/toast-service';
import { SeoService } from '../../../shared/services/seo.service';
import { linkedQuestions, patternsForTag } from '../pattern-utils';
import { markdownExcerpt } from '../markdown-excerpt';

export interface PatternNote {
  pattern: IProblemPattern;
  excerpt: string;
  questionCount: number;
}

@Component({
  selector: 'app-topic-patterns',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './topic-patterns.html',
  styleUrl: './topic-patterns.scss',
})
export class TopicPatterns implements OnInit {
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
  readonly skeletonRows = Array.from({ length: 6 });

  readonly topic = computed<IProblemTag | null>(() => {
    const slug = this.tagSlug();
    return this.tags().find((tag) => tag.slug === slug) ?? null;
  });

  readonly notFound = computed(() => this.hasLoaded() && this.topic() === null);

  readonly notes = computed<PatternNote[]>(() => {
    const topic = this.topic();
    if (!topic) {
      return [];
    }
    const problems = this.problems();
    return patternsForTag(this.patterns(), topic.id).map((pattern) => ({
      pattern,
      excerpt: markdownExcerpt(pattern.explanation),
      questionCount: linkedQuestions(problems, pattern.problemIds ?? []).length,
    }));
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.tagSlug.set(params.get('tagSlug'));
      this.applyMeta();
      this.load();
    });
  }

  retry(): void {
    this.load();
  }

  trackByPatternId(_: number, note: PatternNote) {
    return note.pattern.id;
  }

  getTagNameById(tagId: number): string {
    return this.tags().find((tag) => tag.id === tagId)?.name ?? `Tag #${tagId}`;
  }

  getTagSlugById(tagId: number): string | null {
    return this.tags().find((tag) => tag.id === tagId)?.slug ?? null;
  }

  private applyMeta(): void {
    const topic = this.topic();
    if (!topic && this.hasLoaded()) {
      this.seoService.setPageMeta({
        title: 'Topic not found - DSA Drill',
        description: 'The requested pattern topic does not exist.',
        path: '/question-pattern',
        robots: 'noindex,follow',
      });
      return;
    }
    if (topic) {
      this.seoService.setPageMeta({
        title: `${topic.name} Patterns - DSA Drill`,
        description: `Learn ${topic.name} patterns and practice linked DSA questions with notes and progress tracking.`,
        path: `/question-pattern/${topic.slug}`,
      });
    }
  }

  private load(): void {
    this.loadError.set(false);
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.fail('Unable to load topics'), next: () => this.applyMeta() });
    this.problemPatternService
      .fetchProblemPatterns()
      .subscribe({ error: () => this.fail('Unable to load patterns') });
    this.problemService.fetchProblems().subscribe({ error: () => this.fail('Unable to load') });
  }

  private fail(message: string): void {
    this.loadError.set(true);
    this.toastService.showError(message);
  }
}
