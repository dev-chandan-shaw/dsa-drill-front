import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MarkdownNoteEditor } from '../../../shared/components/markdown-note-editor/markdown-note-editor';
import { TagBasedProblemList } from '../../../shared/components/tag-based-problem-list/tag-based-problem-list';
import { TagPicker } from '../../../shared/components/tag-picker/tag-picker';
import { RightPaneService, RightPaneSize } from '../../../shared/services/right-pane-service';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../../shared/services/public-api/problem-pattern.service';
import { AdminProblemPatternService } from '../services/admin-problem-pattern';
import { ToastService } from '../../../shared/services/toast-service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

// Dedicated Add/Edit Pattern page. The pattern form outgrew the slide-over
// pane (rich editor + multi-select + full question browser), so it gets a
// two-column workspace: details left, linked questions right. Saving is
// explicit via the header Save button; leaving with unsaved edits asks first.
@Component({
  selector: 'app-pattern-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MarkdownNoteEditor,
    TagBasedProblemList,
    TagPicker,
  ],
  templateUrl: './pattern-editor.html',
  styleUrl: './pattern-editor.scss',
})
export class PatternEditor implements OnInit {
  @ViewChild('questionsPane') questionsPane!: TemplateRef<unknown>;
  @ViewChild('tagsPane') tagsPane!: TemplateRef<unknown>;

  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly problemService = inject(PublicProblemService);
  private readonly problemTagService = inject(ProblemTagService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly adminProblemPatternService = inject(AdminProblemPatternService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmDialogService);
  private readonly rightPaneService = inject(RightPaneService);

  readonly tags = this.problemTagService.problemTags;
  readonly problems = this.problemService.problems;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal(false);
  readonly notFound = signal(false);
  readonly editingPatternId = signal<number | null>(null);
  readonly skeletonRows = Array.from({ length: 6 });

  private activeEditId: number | null | undefined = undefined;

  readonly patternForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    explanation: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)]),
    tagIds: this.fb.nonNullable.control<number[]>([], [
      Validators.required,
      Validators.minLength(1),
    ]),
    problemIds: this.fb.nonNullable.control<number[]>([]),
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.problemService.fetchProblems(true).pipe(take(1)).subscribe({
      error: () => this.fail('Unable to load problems'),
    });
    this.problemTagService.fetchProblemTags(true).pipe(take(1)).subscribe({
      error: () => this.fail('Unable to load tags'),
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawId = params.get('id');
      if (rawId === null) {
        this.enterNewMode();
        return;
      }
      const id = Number(rawId);
      if (!Number.isInteger(id)) {
        this.notFound.set(true);
        this.isLoading.set(false);
        return;
      }
      this.enterEditMode(id);
    });
  }

  retry(): void {
    if (this.notFound()) {
      return;
    }
    this.loadError.set(false);
    this.problemService.fetchProblems(true).pipe(take(1)).subscribe({
      error: () => this.fail('Unable to load problems'),
    });
    this.problemTagService.fetchProblemTags(true).pipe(take(1)).subscribe({
      error: () => this.fail('Unable to load tags'),
    });
    const editingId = this.editingPatternId();
    if (editingId !== null) {
      this.activeEditId = undefined;
      this.enterEditMode(editingId);
    }
  }

  save(): void {
    if (this.patternForm.invalid || this.isSaving()) {
      this.patternForm.markAllAsTouched();
      return;
    }
    const formValue = this.patternForm.getRawValue();
    const editingId = this.editingPatternId();
    const request$ =
      editingId !== null
        ? this.adminProblemPatternService.editProblemPattern({
            id: editingId,
            name: formValue.name,
            explanation: formValue.explanation,
            tagIds: formValue.tagIds,
            problemIds: formValue.problemIds ?? [],
          })
        : this.adminProblemPatternService.addProblemPattern({
            name: formValue.name,
            explanation: formValue.explanation,
            tagIds: formValue.tagIds,
            problemIds: formValue.problemIds ?? [],
          });

    this.isSaving.set(true);
    request$
      .pipe(finalize(() => this.isSaving.set(false)), take(1))
      .subscribe({
        next: (saved) => {
          this.problemPatternService.upsertPatternSignal(saved);
          this.patternForm.markAsPristine();
          this.toastService.showSuccess(
            'Pattern saved',
            editingId !== null ? 'Pattern updated.' : 'Pattern added.',
          );
          if (editingId === null && saved && typeof saved.id === 'number') {
            // Move to the edit URL so refresh keeps working.
            this.editingPatternId.set(saved.id);
            this.activeEditId = saved.id;
            this.router.navigate(['/admin/patterns', saved.id, 'edit'], {
              replaceUrl: true,
            });
          }
        },
        error: () => this.toastService.showError('Unable to save problem pattern'),
      });
  }

  back(): void {
    if (this.patternForm.dirty) {
      this.confirmationService
        .confirm({
          title: 'Discard unsaved changes?',
          message: 'You have unsaved changes that will be lost.',
          confirmLabel: 'Discard',
        })
        .pipe(take(1))
        .subscribe((accepted) => {
          if (accepted) {
            this.goBackToList();
          }
        });
      return;
    }
    this.goBackToList();
  }

  getTagNameById(tagId: number): string {
    return this.tags().find((tag) => tag.id === tagId)?.name ?? `Tag #${tagId}`;
  }

  get selectedTagIds(): number[] {
    return this.patternForm.controls.tagIds.value ?? [];
  }

  get linkedProblemIds(): number[] {
    return this.patternForm.controls.problemIds.value ?? [];
  }

  linkedProblems(): { id: number; title: string }[] {
    const wanted = new Set(this.linkedProblemIds);
    return this.problems()
      .filter((problem) => wanted.has(problem.id))
      .map((problem) => ({ id: problem.id, title: problem.title }));
  }

  openQuestionsPane(): void {
    this.rightPaneService.open(this.questionsPane, RightPaneSize.MEDIUM, {
      title: 'Link questions',
    });
  }

  openTagsPane(): void {
    this.rightPaneService.open(this.tagsPane, RightPaneSize.SMALL, {
      title: 'Select tags',
    });
  }

  closePane(): void {
    this.rightPaneService.close();
  }

  removeTag(tagId: number): void {
    const control = this.patternForm.controls.tagIds;
    control.setValue((control.value ?? []).filter((id) => id !== tagId));
    control.markAsTouched();
  }

  removeProblem(problemId: number): void {
    const control = this.patternForm.controls.problemIds;
    control.setValue((control.value ?? []).filter((id) => id !== problemId));
  }

  private goBackToList(): void {
    this.router.navigate(['/admin'], { queryParams: { tab: 'patterns' } });
  }

  private enterNewMode(): void {
    if (this.activeEditId === null) {
      return;
    }
    this.activeEditId = null;
    this.editingPatternId.set(null);
    this.notFound.set(false);
    this.isLoading.set(false);
    this.patternForm.reset({ name: '', explanation: '', tagIds: [], problemIds: [] });
  }

  private enterEditMode(id: number): void {
    if (this.activeEditId === id) {
      return;
    }
    this.isLoading.set(true);
    this.problemPatternService
      .fetchProblemPatterns(true)
      .pipe(take(1))
      .subscribe({
        next: (patterns) => {
          const pattern = patterns.find((item) => item.id === id);
          if (!pattern) {
            this.notFound.set(true);
            this.isLoading.set(false);
            return;
          }
          this.activeEditId = id;
          this.editingPatternId.set(id);
          this.notFound.set(false);
          this.patternForm.reset({
            name: pattern.name,
            explanation: pattern.explanation,
            tagIds: [...(pattern.tagIds ?? [])],
            problemIds: [...(pattern.problemIds ?? [])],
          });
          this.isLoading.set(false);
        },
        error: () => {
          this.fail('Unable to load pattern');
          this.isLoading.set(false);
        },
      });
  }

  private fail(message: string): void {
    this.loadError.set(true);
    this.toastService.showError(message);
  }
}
