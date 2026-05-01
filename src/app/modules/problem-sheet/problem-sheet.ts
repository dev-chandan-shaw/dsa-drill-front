import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { Card } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';

@Component({
  selector: 'app-problem-sheet',
  imports: [ProblemList, Card, ProgressBarModule],
  templateUrl: './problem-sheet.html',
  styleUrl: './problem-sheet.scss',
})
export class ProblemSheet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(PublicProblemService);
  private readonly tagService = inject(ProblemTagService);
  private readonly statusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  problems = signal<IProblem[]>([]);
  sheetId = signal<string | null>(null);
  readonly tags = this.tagService.problemTags;
  readonly problemStatuses = this.statusService.problemStatuses;

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
  readonly sheetTagName = computed(() => {
    const id = this.sheetId();
    if (!id) {
      return '-';
    }

    const tagId = Number(id);
    if (Number.isNaN(tagId)) {
      return '-';
    }

    return this.tags().find((tag) => tag.id === tagId)?.name ?? '-';
  });
  readonly isSheetLoading = signal(true);
  readonly hasLoaded = computed(() => !this.isSheetLoading() && this.tagService.hasLoaded());
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
    const sheetId = this.route.snapshot.paramMap.get('sheetId');
    this.sheetId.set(sheetId);
    if (sheetId) {
      this.isSheetLoading.set(true);
      this.questionService.getProblemsByTag(sheetId).subscribe({
        next: (questions) => this.problems.set(questions),
        error: () => this.isSheetLoading.set(false),
        complete: () => this.isSheetLoading.set(false),
      });
    } else {
      this.isSheetLoading.set(false);
    }

    this.tagService.fetchProblemTags().subscribe();
  }
}
