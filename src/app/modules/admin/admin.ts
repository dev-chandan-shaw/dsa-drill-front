import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable, switchMap, take } from 'rxjs';
import { IProblem, ProblemDifficulty } from '../home/models/Question';
import { IProblemTag } from '../home/models/question-tag';
import { IProblemPattern } from '../home/models/problem-pattern';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { AdminProblemService } from './services/admin-problem';
import { AdminProblemTagService } from './services/admin-problem-tag';
import { AdminProblemPatternService } from './services/admin-problem-pattern';
import { RightPaneService, RightPaneSize } from '../../shared/services/right-pane-service';
import { ToastService } from '../../shared/services/toast-service';
import { FormPaneTemplate } from '../../shared/components/form-pane-template/form-pane-template';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';

type AdminProblemFilter = 'ALL' | 'REVIEW' | 'ARCHIVED';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormPaneTemplate,
    SelectModule,
    MultiSelectModule,
    InputTextModule,
    InputNumberModule,
    Card,
    Button,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  @ViewChild('problemFormTemplate') problemFormTemplate!: TemplateRef<unknown>;
  @ViewChild('tagFormTemplate') tagFormTemplate!: TemplateRef<unknown>;
  @ViewChild('patternFormTemplate') patternFormTemplate!: TemplateRef<unknown>;

  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly problemService = inject(PublicProblemService);
  private readonly problemTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly adminProblemService = inject(AdminProblemService);
  private readonly adminProblemTagService = inject(AdminProblemTagService);
  private readonly adminProblemPatternService = inject(AdminProblemPatternService);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly toastService = inject(ToastService);

  readonly problems = this.problemService.problems;
  readonly tags = this.problemTagService.problemTags;
  readonly patterns = this.problemPatternService.problemPatterns;
  readonly isSavingProblem = signal(false);
  readonly isSavingTag = signal(false);
  readonly isSavingPattern = signal(false);

  readonly searchTerm = signal('');
  readonly tagSearchTerm = signal('');
  readonly patternSearchTerm = signal('');
  readonly selectedDifficulty = signal<'ALL' | ProblemDifficulty>('ALL');
  readonly selectedProblemFilter = signal<AdminProblemFilter>('ALL');
  readonly difficultyFilterControl = new FormControl<'ALL' | ProblemDifficulty>('ALL', {
    nonNullable: true,
  });

  readonly editingQuestionId = signal<number | null>(null);
  readonly editingTagId = signal<number | null>(null);
  readonly editingPatternId = signal<number | null>(null);

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

  readonly reviewQueueCount = computed(
    () => this.problems().filter((question) => !question.isApproved || question.isArchived).length,
  );

  readonly filteredQuestions = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    const selectedDifficulty = this.selectedDifficulty();
    const selectedFilter = this.selectedProblemFilter();

    return this.problems().filter((question) => {
      const matchesSearch =
        !normalizedSearch ||
        question.title.toLowerCase().includes(normalizedSearch) ||
        (question.slug ?? '').toLowerCase().includes(normalizedSearch);

      const matchesDifficulty =
        selectedDifficulty === 'ALL' || question.difficulty === selectedDifficulty;

      const matchesFilter =
        selectedFilter === 'ALL' ||
        (selectedFilter === 'REVIEW' && !question.isApproved) ||
        (selectedFilter === 'ARCHIVED' && question.isArchived);

      return matchesSearch && matchesDifficulty && matchesFilter;
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

    if (!normalizedSearch) {
      return this.patterns();
    }

    return this.patterns().filter((pattern) => {
      const tagName = this.getTagNameById(pattern.tagId).toLowerCase();
      return (
        pattern.name.toLowerCase().includes(normalizedSearch) ||
        pattern.explanation.toLowerCase().includes(normalizedSearch) ||
        tagName.includes(normalizedSearch)
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

  readonly patternForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    explanation: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)]),
    tagId: this.fb.control<number | null>(null, [Validators.required]),
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.difficultyFilterControl.valueChanges.subscribe((value) => {
      this.setDifficultyFilter(value);
    });
  }

  refreshPatterns() {
    this.problemPatternService
      .fetchProblemPatterns()
      .pipe(take(1))
      .subscribe({
        error: () => {
          this.toastService.showError('Unable to reload patterns', 'Please refresh the page.');
        },
      });
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

  setProblemFilter(filter: AdminProblemFilter) {
    this.selectedProblemFilter.set(filter);
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
    request$
      .pipe(
        finalize(() => this.isSavingProblem.set(false)),
        take(1),
        switchMap(() => this.problemService.fetchProblems(true)),
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            'Problem saved',
            editingId ? 'Problem updated.' : 'Problem added.',
          );
          this.rightPaneService.close();
        },
        error: () => {
          this.toastService.showError('Unable to save problem');
        },
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
    request$
      .pipe(
        finalize(() => this.isSavingTag.set(false)),
        take(1),
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Tag saved', editingId ? 'Tag updated.' : 'Tag added.');
          this.rightPaneService.close();
        },
        error: () => {
          this.toastService.showError('Unable to save problem tag');
        },
      });
  }

  openAddPatternPane() {
    this.editingPatternId.set(null);
    this.patternForm.reset({
      name: '',
      explanation: '',
      tagId: null,
    });
    this.rightPaneService.open(this.patternFormTemplate, RightPaneSize.SMALL, {
      title: 'Add Problem Pattern',
    });
  }

  openEditPatternPane(pattern: IProblemPattern) {
    this.editingPatternId.set(pattern.id);
    this.patternForm.reset({
      name: pattern.name,
      explanation: pattern.explanation,
      tagId: pattern.tagId,
    });
    this.rightPaneService.open(this.patternFormTemplate, RightPaneSize.SMALL, {
      title: `Edit Pattern #${pattern.id}`,
    });
  }

  submitPattern() {
    if (this.patternForm.invalid || this.isSavingPattern()) {
      this.patternForm.markAllAsTouched();
      return;
    }

    const formValue = this.patternForm.getRawValue();
    if (formValue.tagId === null) {
      this.toastService.showError('Please select a problem tag');
      return;
    }

    const editingId = this.editingPatternId();
    const request$: Observable<unknown> = editingId
      ? this.adminProblemPatternService.editProblemPattern({
          id: editingId,
          name: formValue.name,
          explanation: formValue.explanation,
          tagId: formValue.tagId,
        })
      : this.adminProblemPatternService.addProblemPattern({
          name: formValue.name,
          explanation: formValue.explanation,
          tagId: formValue.tagId,
        });

    this.isSavingPattern.set(true);
    request$
      .pipe(
        finalize(() => this.isSavingPattern.set(false)),
        take(1),
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            'Pattern saved',
            editingId ? 'Pattern updated.' : 'Pattern added.',
          );
          this.rightPaneService.close();
          this.refreshPatterns();
        },
        error: () => {
          this.toastService.showError('Unable to save problem pattern');
        },
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
