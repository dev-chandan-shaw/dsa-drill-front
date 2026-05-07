import { Component, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { IProblemSheetDetails } from '../../../modules/home/models/problem-sheet';
import { PublicProblemService } from '../../services/public-api/problem.service';
import { IProblem } from '../../../modules/home/models/Question';
import { ProblemFilter } from '../problem-filter/problem-filter';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-problem-sheet-form',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule, ProblemFilter],
  templateUrl: './problem-sheet-form.html',
  styleUrl: './problem-sheet-form.scss',
})
export class ProblemSheetForm {
  sheetCreated = output<IProblemSheetDetails>();
  private readonly problemService = inject(PublicProblemService);
  private readonly toastService = inject(ToastService);

  readonly title = signal('');
  readonly description = signal('');
  readonly selectedProblems = signal<number[]>([]);
  readonly isSelectingProblems = signal(false);
  readonly allProblems = signal<IProblem[]>([]);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      if (this.allProblems().length === 0) {
        this.loadProblems();
      }
    });
  }

  loadProblems() {
    this.isLoading.set(true);
    this.problemService.fetchProblems().subscribe({
      next: () => {
        this.allProblems.set(this.problemService.problems());
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.showError('Failed to load problems');
        this.isLoading.set(false);
      },
    });
  }

  onProblemsSelected(problemIds: number[]) {
    this.selectedProblems.set(problemIds);
    this.isSelectingProblems.set(false);
  }

  removeProblem(problemId: number) {
    this.selectedProblems.update((ids) => ids.filter((id) => id !== problemId));
  }

  createSheet() {
    if (!this.title().trim()) {
      this.toastService.showError('Sheet name is required');
      return;
    }

    const sheet: IProblemSheetDetails = {
      id: 0,
      title: this.title(),
      problemIds: this.selectedProblems(),
      isPublic: false,
    };

    this.sheetCreated.emit(sheet);
  }

  getSelectedProblemCount(): number {
    return this.selectedProblems().length;
  }

  handleTitleInput(event: any) {
    this.title.set(event.target?.value || '');
  }

  handleDescriptionInput(event: any) {
    this.description.set(event.target?.value || '');
  }
}
