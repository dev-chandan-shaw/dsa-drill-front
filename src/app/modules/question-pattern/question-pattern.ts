import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IProblemPattern } from '../home/models/problem-pattern';
import { IProblemTag } from '../home/models/question-tag';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';
import { TopicCover, topicCover } from './topic-covers';

export interface TopicEntry {
  tag: IProblemTag;
  cover: TopicCover;
  patternCount: number;
  questionCount: number;
}

@Component({
  selector: 'app-question-pattern',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './question-pattern.html',
  styleUrl: './question-pattern.scss',
})
export class QuestionPattern implements OnInit {
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
  readonly searchTerm = signal('');
  readonly skeletonRows = Array.from({ length: 6 });

  readonly topics = computed<TopicEntry[]>(() => {
    const questionCounts = new Map<number, number>();
    for (const problem of this.problems()) {
      for (const tagId of problem.tags ?? []) {
        questionCounts.set(tagId, (questionCounts.get(tagId) ?? 0) + 1);
      }
    }
    const patternCounts = new Map<number, number>();
    for (const pattern of this.patterns()) {
      for (const tagId of pattern.tagIds ?? []) {
        patternCounts.set(tagId, (patternCounts.get(tagId) ?? 0) + 1);
      }
    }
    return this.tags()
      .map((tag) => ({
        tag,
        cover: topicCover(tag.slug),
        patternCount: patternCounts.get(tag.id) ?? 0,
        questionCount: questionCounts.get(tag.id) ?? 0,
      }))
      .sort((a, b) => b.patternCount - a.patternCount || a.tag.name.localeCompare(b.tag.name));
  });

  readonly filteredTopics = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.topics();
    }
    return this.topics().filter((topic) => topic.tag.name.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.seoService.setPageMeta({
      title: 'Question Patterns - DSA Drill',
      description:
        'Explore common algorithmic patterns by topic, learn the strategy behind them, and practice linked DSA questions.',
      path: '/question-pattern',
    });
    this.load();
  }

  retry(): void {
    this.load();
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value ?? '');
  }

  trackByTagId(_: number, topic: TopicEntry) {
    return topic.tag.id;
  }

  coverStyle(cover: TopicCover): string {
    return `linear-gradient(135deg, ${cover.from}, ${cover.to})`;
  }

  private load(): void {
    this.loadError.set(false);
    // Unconditional fetches (home-page recipe): they run during SSR so bots
    // see full HTML, then ride TransferState to the client with no refetch.
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.fail('Unable to load topics') });
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
