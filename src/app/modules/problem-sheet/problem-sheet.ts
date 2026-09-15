import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';

@Component({
  selector: 'app-problem-sheet',
  imports: [ProblemList, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './problem-sheet.html',
  styleUrl: './problem-sheet.scss',
})
export class ProblemSheet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(PublicProblemService);
  private readonly tagService = inject(ProblemTagService);
  private readonly statusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  problems = signal<IProblem[]>([]);
  sheetId = signal<string | null>(null);
  readonly tags = this.tagService.problemTags;
  readonly problemStatuses = this.statusService.problemStatuses;

  private readonly seoEffect = effect(() => {
    const tagName = this.sheetTagName();
    if (tagName && tagName !== '-') {
      this.titleService.setTitle(`${tagName} Problems - DSA Drill`);
      this.metaService.updateTag({
        name: 'description',
        content: `Practice handpicked ${tagName} coding questions on DSA Drill. Track your solved questions and prepare for coding interviews.`,
      });
    }
  });

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

    return this.tags().find((tag) => tag.slug === id)?.name ?? '-';
  });
  readonly isSheetLoading = signal(true);
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 6 });
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
    this.load();
  }

  retry() {
    this.load();
  }

  private load() {
    const sheetId = this.route.snapshot.paramMap.get('sheetId');
    this.sheetId.set(sheetId);
    this.loadError.set(false);
    if (sheetId) {
      this.isSheetLoading.set(true);
      this.questionService.getProblemsByTag(sheetId).subscribe({
        next: (questions) => this.problems.set(questions),
        error: () => {
          this.loadError.set(true);
          this.isSheetLoading.set(false);
        },
        complete: () => this.isSheetLoading.set(false),
      });
    } else {
      this.isSheetLoading.set(false);
    }

    this.tagService
      .fetchProblemTags()
      .subscribe({ error: () => this.loadError.set(true) });
  }
}
