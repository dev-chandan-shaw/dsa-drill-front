import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable, take } from 'rxjs';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { IProblemTag } from '../home/models/question-tag';
import { IProblemPattern } from '../home/models/problem-pattern';
import { IApiResponse } from '../../shared/models/ApiResponse';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { AdminProblemService } from './services/admin-problem';
import { AdminProblemTagService } from './services/admin-problem-tag';
import { AdminProblemPatternService } from './services/admin-problem-pattern';
import { RightPaneService, RightPaneSize } from '../../shared/services/right-pane-service';
import { ToastService } from '../../shared/services/toast-service';
import { FormPaneTemplate } from '../../shared/components/form-pane-template/form-pane-template';
import { MarkdownView } from '../../shared/components/markdown-view/markdown-view';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

type AdminTab = 'problems' | 'tags' | 'patterns';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormPaneTemplate,
    MarkdownView,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin implements OnInit {
  @ViewChild('problemFormTemplate') problemFormTemplate!: TemplateRef<unknown>;
  @ViewChild('tagFormTemplate') tagFormTemplate!: TemplateRef<unknown>;

  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly problemService = inject(PublicProblemService);
  private readonly problemTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly adminProblemService = inject(AdminProblemService);
  private readonly adminProblemTagService = inject(AdminProblemTagService);
  private readonly adminProblemPatternService = inject(AdminProblemPatternService);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmDialogService);

  readonly problems = this.problemService.problems;
  readonly tags = this.problemTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly isLoadingProblems = this.problemService.isLoading;
  readonly isLoadingTags = this.problemTagService.isLoading;
  readonly isLoadingPatterns = this.problemPatternService.isLoading;
  readonly isSavingProblem = signal(false);
  readonly isSavingTag = signal(false);
  readonly isDeleting = signal(false);

  readonly activeTab = signal<AdminTab>('problems');

  private static readonly tabOrder: AdminTab[] = ['problems', 'tags', 'patterns'];

  readonly tabIndex = computed(() => Admin.tabOrder.indexOf(this.activeTab()));

  setTabIndex(index: number) {
    const tab = Admin.tabOrder[index];
    if (tab) {
      this.activeTab.set(tab);
    }
  }
  readonly searchTerm = signal('');
  readonly tagSearchTerm = signal('');
  readonly patternSearchTerm = signal('');
  readonly selectedDifficulty = signal<'ALL' | ProblemDifficulty>('ALL');
  readonly selectedPatternTagId = signal<number | null>(null);
  readonly expandedPatternIds = signal<ReadonlySet<number>>(new Set());
  readonly difficultyFilterControl = new FormControl<'ALL' | ProblemDifficulty>('ALL', {
    nonNullable: true,
  });
  readonly patternTagFilterControl = new FormControl<number | null>(null);

  readonly editingQuestionId = signal<number | null>(null);
  readonly editingTagId = signal<number | null>(null);

  readonly QuestionDifficulty = ProblemDifficulty;
  readonly difficultyFilterOptions = [
    { label: 'All difficulties', value: 'ALL' as const },
    { label: 'Easy', value: ProblemDifficulty.Easy },
    { label: 'Medium', value: ProblemDifficulty.Medium },
    { label: 'Hard', value: ProblemDifficulty.Hard },
  ];
  readonly difficultyOptions = [
    { label: 'Easy', value: ProblemDifficulty.Easy },
    { label: 'Medium', value: ProblemDifficulty.Medium },
    { label: 'Hard', value: ProblemDifficulty.Hard },
  ];

  readonly problemCountByTag = computed(() => {
    const counts = new Map<number, number>();
    for (const question of this.problems()) {
      for (const tagId of question.tags ?? []) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  });

  readonly patternCountByTag = computed(() => {
    const counts = new Map<number, number>();
    for (const pattern of this.patterns()) {
      for (const tagId of pattern.tagIds ?? []) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  });

  readonly filteredQuestions = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    const selectedDifficulty = this.selectedDifficulty();

    return this.problems().filter((question) => {
      const matchesSearch =
        !normalizedSearch ||
        question.title.toLowerCase().includes(normalizedSearch) ||
        (question.slug ?? '').toLowerCase().includes(normalizedSearch);

      const matchesDifficulty =
        selectedDifficulty === 'ALL' || question.difficulty === selectedDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  });

  readonly filteredTags = computed(() => {
    const normalizedSearch = this.tagSearchTerm().toLowerCase().trim();

    if (!normalizedSearch) {
      return this.tags();
    }

    return this.tags().filter((tag) => tag.name.toLowerCase().includes(normalizedSearch));
  });

  readonly filteredPatterns = computed(() => {
    const normalizedSearch = this.patternSearchTerm().toLowerCase().trim();
    const selectedTagId = this.selectedPatternTagId();

    return this.patterns().filter((pattern) => {
      if (selectedTagId !== null && !(pattern.tagIds ?? []).includes(selectedTagId)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const tagNames = (pattern.tagIds ?? [])
        .map((tagId) => this.getTagNameById(tagId))
        .join(' ')
        .toLowerCase();
      return (
        pattern.name.toLowerCase().includes(normalizedSearch) ||
        pattern.explanation.toLowerCase().includes(normalizedSearch) ||
        tagNames.includes(normalizedSearch)
      );
    });
  });

  readonly problemForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    link: ['', [Validators.required]],
    categoryIds: [<number[]>[], [Validators.required]],
    difficulty: [ProblemDifficulty.Easy, [Validators.required]],
  });

  readonly tagForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.difficultyFilterControl.valueChanges.subscribe((value) => {
      this.setDifficultyFilter(value);
    });
    this.patternTagFilterControl.valueChanges.subscribe((value) => {
      this.selectedPatternTagId.set(value);
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Admin owns its data: force a fresh load so deep-links and
    // post-save states never render stale/empty lists.
    // The pattern editor returns with ?tab=patterns to land back on its tab.
    this.setActiveTab(this.route.snapshot.queryParamMap.get('tab') ?? undefined);
    this.problemService
      .fetchProblems(true)
      .pipe(take(1))
      .subscribe({
        error: () => this.toastService.showError('Unable to load problems'),
      });
    this.problemTagService
      .fetchProblemTags(true)
      .pipe(take(1))
      .subscribe({
        error: () => this.toastService.showError('Unable to load tags'),
      });
    this.problemPatternService
      .fetchProblemPatterns(true)
      .pipe(take(1))
      .subscribe({
        error: () => this.toastService.showError('Unable to load patterns'),
      });
  }

  setActiveTab(tab: string | number | undefined) {
    if (tab === 'problems' || tab === 'tags' || tab === 'patterns') {
      this.activeTab.set(tab);
    }
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  setTagSearchTerm(value: string) {
    this.tagSearchTerm.set(value);
  }

  setPatternSearchTerm(value: string) {
    this.patternSearchTerm.set(value);
  }

  setPatternTagFilter(value: number | null) {
    this.selectedPatternTagId.set(value);
    this.patternTagFilterControl.setValue(value, { emitEvent: false });
  }

  setDifficultyFilter(value: 'ALL' | ProblemDifficulty) {
    if (
      value === 'ALL' ||
      value === ProblemDifficulty.Easy ||
      value === ProblemDifficulty.Medium ||
      value === ProblemDifficulty.Hard
    ) {
      this.selectedDifficulty.set(value);
    }
  }

  clearProblemFilters() {
    this.searchTerm.set('');
    this.selectedDifficulty.set('ALL');
    this.difficultyFilterControl.setValue('ALL', { emitEvent: false });
  }

  clearPatternFilters() {
    this.patternSearchTerm.set('');
    this.setPatternTagFilter(null);
  }

  togglePatternExpanded(patternId: number) {
    const next = new Set(this.expandedPatternIds());
    if (next.has(patternId)) {
      next.delete(patternId);
    } else {
      next.add(patternId);
    }
    this.expandedPatternIds.set(next);
  }

  isPatternExpanded(patternId: number): boolean {
    return this.expandedPatternIds().has(patternId);
  }

  getProblemCountByTag(tagId: number): number {
    return this.problemCountByTag().get(tagId) ?? 0;
  }

  getPatternCountByTag(tagId: number): number {
    return this.patternCountByTag().get(tagId) ?? 0;
  }

  difficultyClass(value: IProblem['difficulty']): string {
    switch (value) {
      case ProblemDifficulty.Easy:
      case 'EASY' as ProblemDifficulty:
        return 'difficulty-easy';
      case ProblemDifficulty.Medium:
      case 'MED' as ProblemDifficulty:
        return 'difficulty-medium';
      case ProblemDifficulty.Hard:
      case 'HARD' as ProblemDifficulty:
        return 'difficulty-hard';
      default:
        return 'difficulty-medium';
    }
  }

  getDifficultyLabel(value: IProblem['difficulty']): string {
    switch (value) {
      case ProblemDifficulty.Easy:
      case 'EASY' as ProblemDifficulty:
        return 'Easy';
      case ProblemDifficulty.Medium:
      case 'MED' as ProblemDifficulty:
        return 'Medium';
      case ProblemDifficulty.Hard:
      case 'HARD' as ProblemDifficulty:
        return 'Hard';
      default:
        return String(value);
    }
  }

  openAddProblemPane() {
    this.editingQuestionId.set(null);
    this.problemForm.reset({
      title: '',
      link: '',
      categoryIds: [],
      difficulty: ProblemDifficulty.Easy,
    });

    this.rightPaneService.open(this.problemFormTemplate, RightPaneSize.SMALL, {
      title: 'Add Problem',
    });
  }

  openEditProblemPane(question: IProblem) {
    this.editingQuestionId.set(question.id);
    this.problemForm.reset({
      title: question.title,
      link: question.link,
      categoryIds: question.tags,
      difficulty: this.mapDifficulty(question.difficulty),
    });

    this.rightPaneService.open(this.problemFormTemplate, RightPaneSize.SMALL, {
      title: `Edit Problem #${question.id}`,
    });
  }

  submitProblem() {
    if (this.problemForm.invalid || this.isSavingProblem()) {
      this.problemForm.markAllAsTouched();
      return;
    }

    const formValue = this.problemForm.getRawValue();
    const selectedCategoryIds = formValue.categoryIds;

    if (!selectedCategoryIds.length) {
      this.toastService.showError('Please select at least one problem tag');
      return;
    }

    const payload: IProblem = {
      id: this.editingQuestionId() || 0,
      title: formValue.title,
      link: formValue.link,
      tags: selectedCategoryIds,
      difficulty: formValue.difficulty,
    };
    const editingId = this.editingQuestionId();
    const request$ = editingId
      ? this.adminProblemService.editProblem(payload)
      : this.adminProblemService.addProblem(payload);

    this.isSavingProblem.set(true);
    request$.pipe(finalize(() => this.isSavingProblem.set(false)), take(1)).subscribe({
      next: (saved) => {
        // Instant UI update; reconcile with the server in the background.
        this.problemService.upsertProblemSignal(saved);
        this.toastService.showSuccess(
          'Problem saved',
          editingId ? 'Problem updated.' : 'Problem added.',
        );
        this.rightPaneService.close();
        this.problemService
          .fetchProblems(true)
          .pipe(take(1))
          .subscribe({
            error: () => this.toastService.showError('Saved, but the list may be stale'),
          });
      },
      error: () => {
        this.toastService.showError('Unable to save problem');
      },
    });
  }

  confirmDeleteProblem(question: IProblem) {
    this.confirmationService
      .confirm({
        title: 'Delete problem',
        message: `Delete "${question.title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
      })
      .pipe(take(1))
      .subscribe((accepted) => {
        if (accepted) this.deleteProblem(question.id);
      });
  }

  private deleteProblem(problemId: number) {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.adminProblemService
      .deleteProblem(problemId)
      .pipe(finalize(() => this.isDeleting.set(false)), take(1))
      .subscribe({
        next: () => {
          this.problemService.removeProblemSignal(problemId);
          this.toastService.showSuccess('Problem deleted');
        },
        error: () => this.toastService.showError('Unable to delete problem'),
      });
  }

  openAddTagPane() {
    this.editingTagId.set(null);
    this.tagForm.reset({ name: '' });
    this.rightPaneService.open(this.tagFormTemplate, RightPaneSize.SMALL, {
      title: 'Add Problem Tag',
    });
  }

  openEditTagPane(tag: IProblemTag) {
    this.editingTagId.set(tag.id);
    this.tagForm.reset({ name: tag.name });
    this.rightPaneService.open(this.tagFormTemplate, RightPaneSize.SMALL, {
      title: `Edit Tag #${tag.id}`,
    });
  }

  submitTag() {
    if (this.tagForm.invalid || this.isSavingTag()) {
      this.tagForm.markAllAsTouched();
      return;
    }

    const payload = this.tagForm.getRawValue();
    const editingId = this.editingTagId();
    const request$: Observable<unknown> = editingId
      ? this.adminProblemTagService.editProblemTag(editingId, payload)
      : this.adminProblemTagService.addProblemTag(payload);

    this.isSavingTag.set(true);
    request$.pipe(finalize(() => this.isSavingTag.set(false)), take(1)).subscribe({
      next: (response) => {
        const saved = this.normalizeTagResponse(response, editingId, payload.name);
        if (saved) {
          this.problemTagService.upsertTagSignal(saved);
        }
        this.toastService.showSuccess('Tag saved', editingId ? 'Tag updated.' : 'Tag added.');
        this.rightPaneService.close();
        // Background reconcile so the new category shows even if the
        // optimistic shape differs from the server payload.
        this.problemTagService
          .fetchProblemTags(true)
          .pipe(take(1))
          .subscribe({
            error: () => this.toastService.showError('Saved, but the tag list may be stale'),
          });
      },
      error: () => {
        this.toastService.showError('Unable to save problem tag');
      },
    });
  }

  confirmDeleteTag(tag: IProblemTag) {
    const problems = this.getProblemCountByTag(tag.id);
    const patterns = this.getPatternCountByTag(tag.id);
    this.confirmationService
      .confirm({
        title: 'Delete tag',
        message:
          `Delete "${tag.name}"?` +
          (problems || patterns
            ? ` ${problems} problem(s) and ${patterns} pattern(s) use it.`
            : '') +
          ' This cannot be undone.',
        confirmLabel: 'Delete',
      })
      .pipe(take(1))
      .subscribe((accepted) => {
        if (accepted) this.deleteTag(tag.id);
      });
  }

  private deleteTag(tagId: number) {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.adminProblemTagService
      .deleteProblemTag(tagId)
      .pipe(finalize(() => this.isDeleting.set(false)), take(1))
      .subscribe({
        next: () => {
          this.problemTagService.removeTagSignal(tagId);
          this.toastService.showSuccess('Tag deleted');
        },
        error: () => this.toastService.showError('Unable to delete tag'),
      });
  }

  confirmDeletePattern(pattern: IProblemPattern) {
    this.confirmationService
      .confirm({
        title: 'Delete pattern',
        message: `Delete "${pattern.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
      })
      .pipe(take(1))
      .subscribe((accepted) => {
        if (accepted) this.deletePattern(pattern.id);
      });
  }

  private deletePattern(patternId: number) {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.adminProblemPatternService
      .deleteProblemPattern(patternId)
      .pipe(finalize(() => this.isDeleting.set(false)), take(1))
      .subscribe({
        next: () => {
          this.problemPatternService.removePatternSignal(patternId);
          this.toastService.showSuccess('Pattern deleted');
        },
        error: () => this.toastService.showError('Unable to delete pattern'),
      });
  }

  trackByQuestionId(_: number, question: IProblem) {
    return question.id;
  }

  trackByTagId(_: number, tag: IProblemTag) {
    return tag.id;
  }

  trackByPatternId(_: number, pattern: IProblemPattern) {
    return pattern.id;
  }

  getTagNameById(tagId: number) {
    return this.tags().find((tag) => tag.id === tagId)?.name ?? `Tag #${tagId}`;
  }

  closeRightPane() {
    this.rightPaneService.close();
  }

  private normalizeTagResponse(
    response: unknown,
    editingId: number | null,
    fallbackName: string,
  ): IProblemTag | null {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as IApiResponse<IProblemTag>).data ?? null;
    }
    if (response && typeof response === 'object' && 'id' in response) {
      return response as IProblemTag;
    }
    if (editingId !== null) {
      const existing = this.tags().find((tag) => tag.id === editingId);
      if (existing) {
        return { ...existing, name: fallbackName };
      }
    }
    return null;
  }

  private mapDifficulty(value: IProblem['difficulty']): ProblemDifficulty {
    switch (value) {
      case 'EASY':
        return ProblemDifficulty.Easy;
      case 'MED':
        return ProblemDifficulty.Medium;
      case 'HARD':
        return ProblemDifficulty.Hard;
      default:
        return ProblemDifficulty.Easy;
    }
  }
}
