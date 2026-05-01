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
import { InputTextModule } from 'primeng/inputtext';
import { IProblemPattern } from '../home/models/problem-pattern';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { ToastService } from '../../shared/services/toast-service';
import { Card } from 'primeng/card';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-question-pattern',
  imports: [CommonModule, InputTextModule, Card, ProgressBar],
  templateUrl: './question-pattern.html',
  styleUrl: './question-pattern.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionPattern implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly questionTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly toastService = inject(ToastService);

  readonly tags = this.questionTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly hasLoaded = computed(
    () => this.problemPatternService.hasLoaded() && this.questionTagService.hasLoaded(),
  );
  readonly searchTerm = signal('');
  readonly selectedTagId = signal<number | null>(null);
  readonly totalPatternCount = computed(() => this.patterns().length);
  readonly filteredPatternCount = computed(() => this.filteredPatterns().length);
  readonly filterProgress = computed(() => {
    const total = this.totalPatternCount();
    if (!total) {
      return 0;
    }

    return Math.round((this.filteredPatternCount() / total) * 100);
  });

  readonly patternCountByTag = computed(() => {
    const counts = new Map<number, number>();
    for (const pattern of this.patterns()) {
      counts.set(pattern.tagId, (counts.get(pattern.tagId) ?? 0) + 1);
    }
    return counts;
  });

  readonly filteredPatterns = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    const selectedTagId = this.selectedTagId();

    return this.patterns().filter((pattern) => {
      const matchesTag = selectedTagId === null || pattern.tagId === selectedTagId;
      if (!matchesTag) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const tagName = this.getTagNameById(pattern.tagId).toLowerCase();
      return (
        pattern.name.toLowerCase().includes(normalizedSearch) ||
        pattern.explanation.toLowerCase().includes(normalizedSearch) ||
        tagName.includes(normalizedSearch)
      );
    });
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  }

  ngOnInit(): void {
    this.questionTagService.fetchProblemTags().subscribe();
    this.problemPatternService.fetchProblemPatterns().subscribe();
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  setSelectedTagId(tagId: number | null) {
    this.selectedTagId.set(tagId);
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
