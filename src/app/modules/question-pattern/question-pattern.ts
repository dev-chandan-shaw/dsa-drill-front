import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IProblemPattern } from '../home/models/problem-pattern';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-question-pattern',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './question-pattern.html',
  styleUrl: './question-pattern.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionPattern implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly questionTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  readonly tags = this.questionTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly hasLoaded = computed(
    () => this.problemPatternService.hasLoaded() && this.questionTagService.hasLoaded(),
  );
  readonly selectedTagId = signal<number | null>(null);
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 5 });

  readonly patternCountByTag = computed(() => {
    const counts = new Map<number, number>();
    for (const pattern of this.patterns()) {
      counts.set(pattern.tagId, (counts.get(pattern.tagId) ?? 0) + 1);
    }
    return counts;
  });

  readonly filteredPatterns = computed(() => {
    const selectedTagId = this.selectedTagId();

    return this.patterns().filter((pattern) => {
      return selectedTagId === null || pattern.tagId === selectedTagId;
    });
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  }

  ngOnInit(): void {
    this.seoService.setPageMeta({
      title: 'Question Patterns - DSA Drill',
      description:
        'Explore common algorithmic patterns, structure logic, and learn strategies to solve complex DSA problems effectively.',
      path: '/question-pattern',
    });
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loadError.set(false);
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.fail('Unable to load tags') });
    this.problemPatternService
      .fetchProblemPatterns()
      .subscribe({ error: () => this.fail('Unable to load patterns') });
  }

  private fail(message: string): void {
    this.loadError.set(true);
    this.toastService.showError(message);
  }

  setSelectedTagId(tagId: number | null) {
    this.selectedTagId.set(this.selectedTagId() === tagId ? null : tagId);
  }

  clearFilters() {
    this.selectedTagId.set(null);
  }

  getTagNameById(tagId: number) {
    return this.tags().find((tag) => tag.id === tagId)?.name ?? `Tag #${tagId}`;
  }

  getPatternCountByTag(tagId: number) {
    return this.patternCountByTag().get(tagId) ?? 0;
  }

  trackByPatternId(_: number, pattern: IProblemPattern) {
    return pattern.id;
  }
}
