import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { Card } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemSheetService } from '../../shared/services/public-api/problem-sheet.service';
import { RightPaneService, RightPaneSize } from '../../shared/services/right-pane-service';
import { TagBasedProblemList } from '../../shared/components/tag-based-problem-list/tag-based-problem-list';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastService } from '../../shared/services/toast-service';

@Component({
  selector: 'app-problem-sheet',
  imports: [CommonModule, ProblemList, Card, ProgressBarModule, ButtonModule, TagBasedProblemList],
  templateUrl: './problem-sheet.html',
  styleUrl: './problem-sheet.scss',
})
export class ProblemSheet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(PublicProblemService);
  private readonly tagService = inject(ProblemTagService);
  private readonly statusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  private readonly problemSheetService = inject(ProblemSheetService);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly toastService = inject(ToastService);

  problemSelectorTemplate = viewChild('problemSelectorTemplate', { read: TemplateRef });

  problems = signal<IProblem[]>([]);
  allProblems = signal<IProblem[]>([]);
  sheetId = signal<string | null>(null);
  sheetName = signal<string>('');
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

    this.tagService.fetchProblemTags().subscribe();
    this.questionService.fetchProblems().subscribe({
      next: () => this.allProblems.set(this.questionService.problems()),
    });

    if (sheetId) {
      this.isSheetLoading.set(true);
      const id = Number(sheetId);
      this.problemSheetService.getProblemSheetById(id).subscribe({
        next: (sheet) => {
          this.sheetName.set(sheet.title);
          const sheetProblems = this.allProblems().filter((p) => sheet.problemIds.includes(p.id));
          this.problems.set(sheetProblems);
        },
        error: () => {
          this.toastService.showError('Failed to load sheet');
          this.isSheetLoading.set(false);
        },
        complete: () => this.isSheetLoading.set(false),
      });
    } else {
      this.isSheetLoading.set(false);
    }
  }

  openProblemSelector() {
    this.rightPaneService.open(this.problemSelectorTemplate()!, RightPaneSize.LARGE, {
      title: 'Add Problems to Sheet',
    });
  }

  onProblemsSelected(selectedProblemIds: number[]) {
    if (!this.sheetId()) {
      return;
    }

    const sheetId = Number(this.sheetId());
    if (Number.isNaN(sheetId)) {
      return;
    }

    const currentIds = this.problems().map((p) => p.id);
    const newIds = [...new Set([...currentIds, ...selectedProblemIds])];

    const sheet = {
      id: sheetId,
      title: this.sheetName(),
      problemIds: newIds,
      isPublic: false,
    };

    this.problemSheetService.updateProblemSheet(sheet).subscribe({
      next: () => {
        this.toastService.showSuccess('Problems added successfully');
        const addedProblems = this.allProblems().filter((p) => selectedProblemIds.includes(p.id));
        this.problems.update((current) => [...current, ...addedProblems]);
        this.rightPaneService.close();
      },
      error: () => {
        this.toastService.showError('Failed to add problems');
      },
    });
  }
}
