import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SheetSummaryCard } from '../../shared/components/sheet-summary-card/sheet-summary-card';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { TagBasedProblemList } from '../../shared/components/tag-based-problem-list/tag-based-problem-list';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { RightPaneService, RightPaneSize } from '../../shared/services/right-pane-service';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormPaneTemplate } from '../../shared/components/form-pane-template/form-pane-template';
import { catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ProblemSheetService } from '../../shared/services/public-api/problem-sheet.service';
import { IProblemSheetDetails } from '../home/models/problem-sheet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ItemActions } from '../library/personal/item-actions';

@Component({
  selector: 'app-custom-problem-sheet',
  imports: [
    CommonModule,
    ItemActions,
    ProblemList,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SheetSummaryCard,
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

  private readonly rightPaneService = inject(RightPaneService);
  private readonly toastService = inject(ToastService);
  private readonly seoService = inject(SeoService);

  private readonly destroyRef = inject(DestroyRef);

  problemSelectorTemplate = viewChild('problemSelectorTemplate', { read: TemplateRef });
  private openedQuestionPickerFor: string | null = null;
  private readonly openRequestedQuestionPicker = effect(() => {
    const sheet = this.problemSheet();
    const template = this.problemSelectorTemplate();
    if (sheet?.isOwner && template && this.route.snapshot.queryParamMap?.get('addQuestions') === 'true'
      && this.openedQuestionPickerFor !== sheet.id) {
      this.openedQuestionPickerFor = sheet.id;
      this.openProblemSelector();
    }
  });

  problemSheet = signal<IProblemSheetDetails | null>(null);
  problems = computed(() => {
    const byId = new Map(this.allProblems().map(p => [p.id,p]));
    return (this.problemSheet()?.problemIds ?? []).flatMap(id => byId.get(id) ?? []);
  });
  allProblems = signal<IProblem[]>([]);
  sheetId = signal<string | null>(null);
  sheetName = signal<string>('');
  isOwner = signal(false);
  readonly loadError = signal(false);
  readonly changingVisibility = signal(false);
  readonly sharedByLink = computed(() => {
    const sheet = this.problemSheet();
    return !!sheet && (sheet.isPublic || sheet.visibilityConfigured === false);
  });
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

    this.route.paramMap.pipe(
      map(params=>params.get('sheetId')),
      tap(id=>{
        this.sheetId.set(id); this.problemSheet.set(null); this.isOwner.set(false);
        this.sheetName.set(''); this.loadError.set(false); this.isSheetLoading.set(true);
      }),
      switchMap(id=>id ? this.authService.loadCurrentUser().pipe(
        switchMap(user=>forkJoin({sheet:this.problemSheetService.getProblemSheetById(id,!!user),problems:this.questionService.fetchProblems()})),
        catchError(()=>of(null)),
      ) : of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result=>{
      this.isSheetLoading.set(false);
      if(!result){this.loadError.set(true);return;}
      this.sheetName.set(result.sheet.title); this.problemSheet.set(result.sheet);
      this.isOwner.set(!!result.sheet.isOwner); this.allProblems.set(result.problems);
    });
  }

  selectionForm = new FormGroup({
    problemIds: new FormControl<number[]>([], { nonNullable: true }),
  });

  openProblemSelector() {
    const template = this.problemSelectorTemplate();
    if (!this.isOwner() || !template || this.isSelectionSaving()) return;
    this.selectionForm.controls.problemIds.setValue(this.problemSheet()?.problemIds ?? []);
    this.rightPaneService.open(template, RightPaneSize.MEDIUM, { title: 'Add questions' });
  }

  closeProblemSelector() {
    this.rightPaneService.close();
  }

  toggleVisibility() {
    const sheet = this.problemSheet();
    if (!sheet?.isOwner || this.changingVisibility()) return;
    this.changingVisibility.set(true);
    this.problemSheetService.updateVisibility(sheet.id, !this.sharedByLink())
      .pipe(finalize(() => this.changingVisibility.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (result.id !== this.sheetId()) return;
          this.problemSheet.set(result);
          this.toastService.showSuccess(result.isPublic ? 'Anyone with the link can open this sheet' : 'Sheet is now private');
        },
        error: () => this.toastService.showError('Could not update sheet visibility'),
      });
  }

  applyProblemSelection() {
    const selectedIds = this.selectionForm.controls.problemIds.value;
    this.onProblemsSelected(selectedIds);
  }

  onProblemsSelected(selectedProblemIds: number[]) {
    if (!this.sheetId() || !this.isOwner() || this.isSelectionSaving()) {
      return;
    }

    const sheet = {
      id: this.sheetId() ?? '',
      title: this.sheetName(),
      problemIds: selectedProblemIds,
      isPublic: this.problemSheet()?.isPublic ?? false,
    };

    this.isSelectionSaving.set(true);
    this.problemSheetService
      .updateProblemSheet(sheet)
      .pipe(finalize(() => this.isSelectionSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Problems added successfully');
          this.problemSheet.update((current) => current ? { ...current, problemIds: selectedProblemIds } : current);
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
