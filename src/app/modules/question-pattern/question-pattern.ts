import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IProblemTag } from '../home/models/question-tag';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';
import { TopicCover, resolveTopicCover } from './topic-covers';

export interface TopicEntry {
  tag: IProblemTag;
  cover: TopicCover;
  patternCount: number;
}

@Component({
  selector: 'app-question-pattern',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './question-pattern.html',
  styleUrl: './question-pattern.scss',
})
export class QuestionPattern implements OnInit {
  private readonly questionTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  readonly tags = this.questionTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly hasLoaded = computed(
    () => this.problemPatternService.hasLoaded() && this.questionTagService.hasLoaded(),
  );
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 6 });

  readonly topics = computed<TopicEntry[]>(() => {
    const patternCounts = new Map<number, number>();
    for (const pattern of this.patterns()) {
      for (const tagId of pattern.tagIds ?? []) {
        patternCounts.set(tagId, (patternCounts.get(tagId) ?? 0) + 1);
      }
    }
    return this.tags()
      .map((tag) => ({
        tag,
        cover: resolveTopicCover(tag),
        patternCount: patternCounts.get(tag.id) ?? 0,
      }))
      .filter((topic) => topic.patternCount > 0)
      .sort((a, b) => b.patternCount - a.patternCount || a.tag.name.localeCompare(b.tag.name));
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
  }

  private fail(message: string): void {
    this.loadError.set(true);
    this.toastService.showError(message);
  }
}
