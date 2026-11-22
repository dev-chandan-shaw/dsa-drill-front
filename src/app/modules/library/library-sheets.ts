import { Component, DestroyRef, effect, inject, OnDestroy, signal, TemplateRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemSheetService } from '../../shared/services/public-api/problem-sheet.service';
import { ToastService } from '../../shared/services/toast-service';
import { RightPaneService, RightPaneSize } from '../../shared/services/right-pane-service';
import { FormPaneTemplate } from '../../shared/components/form-pane-template/form-pane-template';
import { TagBasedProblemList } from '../../shared/components/tag-based-problem-list/tag-based-problem-list';
import { IProblemSheetDetails, IProblemSheetSummary } from '../home/models/problem-sheet';

@Component({
  selector: 'app-library-sheets',
  imports: [RouterLink, MatIconModule, FormPaneTemplate, TagBasedProblemList],
  template: `
    <div class="sheets">
      @if (!isLoggedIn()) {
        <section class="sheets-intro">
          <h2>Keep a list of what to practice next.</h2>
          <p>Log in to create private lists and save lists shared by others.</p>
          <a class="sheet-action" routerLink="/login" [queryParams]="{ returnUrl: '/library/dsa/sheets' }">Log in</a>
        </section>
      } @else if (loadError()) {
        <section class="sheets-intro">
          <h2>Your lists did not load.</h2>
          <p>Check your connection and try again.</p>
          <button class="sheet-action" type="button" (click)="loadLists()">Try again</button>
        </section>
      } @else {
        @if (!hasLoadedLists()) {
          <div class="library-loading"><p role="status">Loading your lists…</p></div>
        } @else {
        <section class="sheet-section">
          <form class="new-list" (submit)="createList($event)">
            <input
              type="text"
              [value]="newTitle()"
              (input)="setNewTitle($event)"
              placeholder="Name a new list"
              aria-label="New list name"
            />
            <button class="sheet-action" type="submit" [disabled]="isCreating() || !newTitle().trim()">
              {{ isCreating() ? 'Creating…' : 'Create list' }}
            </button>
          </form>
          @if (lists().length === 0) {
            <p class="sheet-empty">No lists yet. Start with one above.</p>
          } @else {
            <div class="sheet-rows">
              @for (list of lists(); track list.id) {
                <div class="sheet-row-group">
                <button class="sheet-row" type="button" (click)="openList(list.id)">
                  <span>{{ list.title }}</span>
                  <mat-icon aria-hidden="true">north_east</mat-icon>
                </button>
                <button class="sheet-action" type="button" (click)="openQuestionPicker(list)" [attr.aria-label]="'Add questions to ' + list.title">
                  Add questions
                </button>
                </div>
              }
            </div>
          }
        </section>
        }
      }
    </div>
    <ng-template #questionPicker>
      <app-form-pane-template
        [form]="questionForm"
        [isSaving]="savingQuestions()"
        [isEditMode]="true"
        [title]="'Add questions to ' + pickerTarget()?.title"
        (saveForm)="saveQuestions()"
        (cancelForm)="closeQuestionPicker()"
      >
        @if (loadingQuestions()) {
          <p role="status">Loading questions…</p>
        } @else if (questionLoadError()) {
          <p role="alert">{{ questionLoadError() }}</p>
          <button class="sheet-action" type="button" (click)="openQuestionPicker(pickerTarget()!)">Try again</button>
        } @else {
          <app-tag-based-problem-list [selectedControl]="questionForm.controls.problemIds" />
        }
      </app-form-pane-template>
    </ng-template>
  `,
  styleUrls: ['./library-loading.scss', './library-sheets.scss'],
})
export class LibrarySheets implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly problemSheetService = inject(ProblemSheetService);
  private readonly toastService = inject(ToastService);
  private readonly rightPane = inject(RightPaneService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly questionPicker = viewChild<TemplateRef<unknown>>('questionPicker');
  private pickerSequence = 0;
  readonly pickerTarget = signal<IProblemSheetSummary | null>(null);
  readonly editingSheet = signal<IProblemSheetDetails | null>(null);
  readonly loadingQuestions = signal(false);
  readonly savingQuestions = signal(false);
  readonly questionLoadError = signal('');
  readonly questionForm = new FormGroup({ problemIds: new FormControl<number[]>([], { nonNullable: true }) });

  readonly isLoggedIn = this.authService.isLoggedIn();
  readonly lists = this.problemSheetService.problemSheets;
  readonly hasLoadedLists = this.problemSheetService.hasLoaded;
  readonly newTitle = signal('');
  readonly isCreating = signal(false);
  readonly loadError = signal(false);
  private loaded = false;

  constructor() {
    effect(() => {
      if (this.isLoggedIn() && !this.loaded) {
        this.loaded = true;
        this.loadLists();
      }
    });
  }

  loadLists() {
    this.loadError.set(false);
    this.problemSheetService.fetchProblemSheets().catch(() => this.loadError.set(true));
  }

  setNewTitle(event: Event) {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  createList(event: Event) {
    event.preventDefault();
    const title = this.newTitle().trim();
    if (!title || this.isCreating()) {
      return;
    }
    this.isCreating.set(true);
    this.problemSheetService
      .createProblemSheet({
        id: '',
        title,
        problemIds: [],
        isPublic: false,
        isOwner: true,
      })
      .subscribe({
        next: (saved) => {
          this.isCreating.set(false);
          this.newTitle.set('');
          this.toastService.showSuccess('List created');
          void this.problemSheetService.fetchProblemSheets().catch(() => undefined);
          this.router.navigate(['/problems-sheet', saved.id]);
        },
        error: () => {
          this.isCreating.set(false);
          this.toastService.showError('Failed to create list');
        },
      });
  }

  openList(id: string) {
    this.router.navigate(['/problems-sheet', id]);
  }

  openQuestionPicker(list: IProblemSheetSummary) {
    const template = this.questionPicker();
    if (!template || this.savingQuestions()) return;
    const sequence = ++this.pickerSequence;
    this.pickerTarget.set(list);
    this.editingSheet.set(null);
    this.loadingQuestions.set(true);
    this.questionLoadError.set('');
    this.questionForm.reset({ problemIds: [] });
    this.questionForm.disable();
    this.rightPane.open(template, RightPaneSize.MEDIUM, { title: `Add questions to ${list.title}` });
    this.problemSheetService.getProblemSheetById(list.id, true)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (sheet) => {
          if (sequence !== this.pickerSequence) return;
          this.loadingQuestions.set(false);
          if (!sheet.isOwner) {
            this.questionLoadError.set('Only the owner can add questions to this sheet.');
            return;
          }
          this.editingSheet.set(sheet);
          this.questionForm.controls.problemIds.setValue([...sheet.problemIds]);
          this.questionForm.enable();
        },
        error: () => {
          if (sequence !== this.pickerSequence) return;
          this.loadingQuestions.set(false);
          this.questionLoadError.set('Could not load your sheet. Try again.');
        },
      });
  }

  saveQuestions() {
    const sheet = this.editingSheet();
    if (!sheet || this.loadingQuestions() || this.savingQuestions()) return;
    this.savingQuestions.set(true);
    this.rightPane.disableClose = true;
    const updated = { ...sheet, problemIds: this.questionForm.controls.problemIds.value };
    this.problemSheetService.updateProblemSheet(updated)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.savingQuestions.set(false);
          this.rightPane.disableClose = false;
          this.toastService.showSuccess('Questions saved');
          this.closeQuestionPicker();
        },
        error: () => {
          this.savingQuestions.set(false);
          this.rightPane.disableClose = false;
          this.toastService.showError('Could not save questions. Try again.');
        },
      });
  }

  closeQuestionPicker() {
    if (this.savingQuestions()) return;
    this.pickerSequence++;
    this.rightPane.close();
  }

  ngOnDestroy() {
    if (this.rightPane.template === this.questionPicker()) this.rightPane.close();
  }
}
