import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { TagBasedProblemList } from '../../shared/components/tag-based-problem-list/tag-based-problem-list';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { RightPaneService } from '../../shared/services/right-pane-service';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormPaneTemplate } from '../../shared/components/form-pane-template/form-pane-template';
import { finalize, map, of, switchMap } from 'rxjs';
import { ProblemSheetService } from '../../shared/services/public-api/problem-sheet.service';
import { SavedProblemSheetService } from '../../shared/services/public-api/saved-problem-sheet.service';
import { IProblemSheetDetails } from '../home/models/problem-sheet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-custom-problem-sheet',
  imports: [
    CommonModule,
    ProblemList,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TagBasedProblemList,
    ReactiveFormsModule,
    FormPaneTemplate,
  ],
  templateUrl: './custom-problem-sheet.html',
  styleUrl: './custom-problem-sheet.scss',
})
export class CustomProblemSheet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(PublicProblemService);
  private readonly tagService = inject(ProblemTagService);
  private readonly statusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  private readonly problemSheetService = inject(ProblemSheetService);
  private readonly savedProblemSheetService = inject(SavedProblemSheetService);

  private readonly rightPaneService = inject(RightPaneService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  private readonly destroyRef = inject(DestroyRef);

  problemSelectorTemplate = viewChild('problemSelectorTemplate', { read: TemplateRef });

  problemSheet = signal<IProblemSheetDetails | null>(null);
  problems = linkedSignal(() =>
    this.allProblems().filter((p) => this.problemSheet()?.problemIds.includes(p.id)),
  );
  allProblems = signal<IProblem[]>([]);
  sheetId = signal<string | null>(null);
  sheetName = signal<string>('');
  isOwner = signal(false);
  isProblemSheetSaved = signal(false);
  readonly tags = this.tagService.problemTags;
  readonly problemStatuses = this.statusService.problemStatuses;

  private readonly seoEffect = effect(() => {
    const sheetName = this.sheetName();
    const id = this.sheetId();
    if (sheetName) {
      this.seoService.setPageMeta({
        title: `${sheetName} - DSA Drill`,
        description: `Practice the custom problem sheet "${sheetName}" on DSA Drill. Solve curated coding challenges, track status, and study efficiently.`,
        // Client-only route: still set OG/canonical for share previews + SPA nav.
        path: id ? `/problems-sheet/${id}` : undefined,
        robots: 'noindex, follow',
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

  readonly isSheetLoading = signal(true);
  readonly skeletonRows = Array.from({ length: 6 });
  readonly hasLoaded = computed(() => !this.isSheetLoading() && this.tagService.hasLoaded());
  readonly isSelectionSaving = signal(false);
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
    this.tagService.fetchProblemTags().subscribe();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const sheetId = params.get('sheetId');
      this.sheetId.set(sheetId);

      // Reset state on every sheetId change
      this.problemSheet.set(null);
      this.allProblems.set([]);
      this.isSheetLoading.set(true);

      this.questionService.fetchProblems().subscribe({
        next: () => this.allProblems.set(this.questionService.problems()),
      });

      if (sheetId) {
        const id = sheetId;
        this.problemSheetService
          .getProblemSheetById(id)
          .pipe(
            switchMap((sheet) => {
              if (this.authService.isLoggedIn()()) {
                return this.savedProblemSheetService.getAllProblemSheets().pipe(map(() => sheet));
              } else {
                return of(sheet);
              }
            }),
          )
          .subscribe({
            next: (sheet) => {
              this.sheetName.set(sheet.title);
              this.problemSheet.set(sheet);
              this.isOwner.set(!!sheet.isOwner);
              this.isProblemSheetSaved.set(this.savedProblemSheetService.isProblemSheetSaved(id));
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
    });
  }

  selectionForm = new FormGroup({
    problemIds: new FormControl<number[]>([], { nonNullable: true }),
  });

  openProblemSelector() {
    this.selectionForm.controls.problemIds.setValue(this.problems().map((p) => p.id));
    this.rightPaneService.open(this.problemSelectorTemplate()!);
  }

  saveProblemSheet() {
    if (this.sheetId()) {
      this.savedProblemSheetService.saveProblemSheet(this.sheetId() ?? '').subscribe();
    }
  }

  unsaveProblemSheet(id: string) {
    this.savedProblemSheetService.unsaveProblemSheet(id).subscribe();
  }

  toggleSavedSheet() {
    if (this.isProblemSheetSaved()) {
      this.unsaveProblemSheet(this.sheetId() ?? '');
      this.isProblemSheetSaved.set(false);
    } else {
      this.saveProblemSheet();
      this.isProblemSheetSaved.set(true);
    }
  }

  closeProblemSelector() {
    this.rightPaneService.close();
  }

  applyProblemSelection() {
    const selectedIds = this.selectionForm.controls.problemIds.value;
    this.onProblemsSelected(selectedIds);
  }

  onProblemsSelected(selectedProblemIds: number[]) {
    if (!this.sheetId()) {
      return;
    }

    const sheet = {
      id: this.sheetId() ?? '',
      title: this.sheetName(),
      problemIds: selectedProblemIds,
      isPublic: false,
    };

    this.isSelectionSaving.set(true);
    this.problemSheetService
      .updateProblemSheet(sheet)
      .pipe(finalize(() => this.isSelectionSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Problems added successfully');
          const updatedProblems = this.allProblems().filter((p) =>
            selectedProblemIds.includes(p.id),
          );
          this.problems.set(updatedProblems);
          this.rightPaneService.close();
        },
        error: () => {
          this.toastService.showError('Failed to add problems');
        },
      });
  }

  getSheetIdLabel() {
    return this.sheetId() ? `#${this.sheetId()}` : 'Unassigned';
  }
}
