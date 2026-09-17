import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserQuestionStatusDto } from '../../../modules/home/models/Question-status';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProblemDrillService } from '../../../modules/home/services/problem-drill.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProblemStatusApiService } from '../../../modules/home/services/user/question-status-api.service';
import { IProblem } from '../../../modules/home/models/Question';
import { FormPaneTemplate } from '../form-pane-template/form-pane-template';
import { RightPaneService, RightPaneSize } from '../../services/right-pane-service';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-problem-list',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    CommonModule,
    FormPaneTemplate,
    ReactiveFormsModule,
  ],
  templateUrl: './problem-list.html',
  styleUrl: './problem-list.scss',
})
export class ProblemList implements OnInit {
  @ViewChild('noteTemplate') noteTemplate!: TemplateRef<any>;

  isNoteSaving = signal(false);

  private readonly problemDrillService = inject(ProblemDrillService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly rightPaneService = inject(RightPaneService);
  private readonly router = inject(Router);
  public selectedProblemId: number | null = null;
  noteForm = this.fb.group({
    note: this.fb.control(''),
  });

  problems = input.required<IProblem[]>();
  readonly searchTerm = signal('');
  readonly revisionOnly = signal(false);
  problemStatuses = this.questionStatusService.problemStatuses;
  readonly filteredProblems = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const revisionOnly = this.revisionOnly();

    return this.problems().filter((problem) => {
      const matchesSearch =
        !normalizedSearch || problem.title.toLowerCase().includes(normalizedSearch);
      const matchesRevision = !revisionOnly || !!this.problemStatuses()[problem.id]?.revision;

      return matchesSearch && matchesRevision;
    });
  });

  ngOnInit(): void {
    this.problemDrillService.init(this.problems());
  }

  pickRandom() {
    const problem = this.problemDrillService.next();
    if (!problem) return;
    globalThis.open(problem.link, '_blank');
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  setRevisionFilter(revisionOnly: boolean) {
    this.revisionOnly.set(revisionOnly);
  }

  clearListFilters() {
    this.searchTerm.set('');
    this.revisionOnly.set(false);
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm().trim() !== '' || this.revisionOnly();
  }

  toggleMarkForRevision(problemId: number) {
    const isMarked = !this.problemStatuses()[problemId]?.revision;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      revision: isMarked,
      note: this.problemStatuses()[problemId]?.note,
      solved: this.problemStatuses()[problemId]?.solved,
    };
    this.questionStatusService.updateProblemStatus(status).subscribe(() => {
      this.rightPaneService.close();
      this.clearSelectedProblem();
    });
  }

  toggleSolved(problemId: number) {
    const isSolved = !this.problemStatuses()[problemId]?.solved;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      solved: isSolved,
      note: this.problemStatuses()[problemId]?.note,
      revision: this.problemStatuses()[problemId]?.revision,
    };
    this.questionStatusService.updateProblemStatus(status).subscribe();
  }

  updateNote() {
    const problemId = this.selectedProblemId;
    if (problemId === null) return;
    this.isNoteSaving.set(true);
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      revision: this.problemStatuses()[problemId]?.revision,
      note: this.noteForm.value.note ?? '',
      solved: this.problemStatuses()[problemId]?.solved,
    };
    this.questionStatusService
      .updateProblemStatus(status)
      .pipe(finalize(() => this.isNoteSaving.set(false)))
      .subscribe(() => {
        this.rightPaneService.close();
        this.clearSelectedProblem();
      });
  }

  editNote(problemId: number) {
    if (!this.authService.isLoggedIn()()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    } else {
      this.selectedProblemId = problemId;
      this.isNoteSaving.set(false);
      this.noteForm.reset({
        note: this.problemStatuses()[problemId]?.note ?? '',
      });
      this.rightPaneService.open(this.noteTemplate, RightPaneSize.MEDIUM, {
        title: 'Edit Note',
        context: {
          problemId: problemId,
          note: this.problemStatuses()[problemId]?.note,
        },
      });
    }
  }

  clearSelectedProblem() {
    this.rightPaneService.close();
    this.selectedProblemId = null;
    this.isNoteSaving.set(false);
    this.noteForm.reset({ note: '' });
  }

  getSelectedProblemId() {
    return this.selectedProblemId;
  }

  getNoteTitle() {
    const problem = this.problems().find((problem) => problem.id === this.selectedProblemId);
    return problem?.title ?? '';
  }

  difficultyLabel(difficulty: IProblem['difficulty']): string {
    switch (difficulty) {
      case 'EASY':
        return 'Easy';
      case 'MED':
        return 'Medium';
      case 'HARD':
        return 'Hard';
      default:
        return String(difficulty);
    }
  }
}
