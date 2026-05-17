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
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { UserQuestionStatusDto } from '../../../modules/home/models/Question-status';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProblemDrillService } from '../../../modules/home/services/problem-drill.service';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProblemStatusApiService } from '../../../modules/home/services/user/question-status-api.service';
import { IProblem } from '../../../modules/home/models/Question';
import { FormPaneTemplate } from '../form-pane-template/form-pane-template';
import { RightPaneService, RightPaneSize } from '../../services/right-pane-service';
import { finalize } from 'rxjs';
@Component({
  selector: 'app-problem-list',
  imports: [
    ButtonModule,
    TagModule,
    CommonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TooltipModule,
    FormsModule,
    SelectButtonModule,
    FormPaneTemplate,
    ReactiveFormsModule,
  ],
  templateUrl: './problem-list.html',
  styleUrl: './problem-list.scss',
})
export class ProblemList implements OnInit {
  @ViewChild('noteTemplate') noteTemplate!: TemplateRef<any>;

  stateOptions = [
    { label: 'All', value: 'all' },
    { label: 'Revision', value: 'revision' },
  ];

  value = 'all';
  isNoteSaved = signal(false);

  private readonly problemDrillService = inject(ProblemDrillService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly fb = inject(FormBuilder);
  readonly rightPaneService = inject(RightPaneService);
  public selectedProblemId: number | null = null;
  noteForm = this.fb.group({
    note: this.fb.control(''),
  });

  problems = input.required<IProblem[]>();
  readonly searchTerm = signal('');
  problemStatuses = this.questionStatusService.problemStatuses;
  readonly filteredProblems = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const revisionOnly = this.value === 'revision';

    return this.problems().filter((problem) => {
      const matchesSearch =
        !normalizedSearch || problem.title.toLowerCase().includes(normalizedSearch);
      const matchesRevision = !revisionOnly || this.problemStatuses()[problem.id]?.revision;

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

  filterRevision(value: string) {
    this.value = value === this.value ? 'all' : value;
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
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
    this.isNoteSaved.set(true);
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      revision: this.problemStatuses()[problemId]?.revision,
      note: this.noteForm.value.note ?? '',
      solved: this.problemStatuses()[problemId]?.solved,
    };
    this.questionStatusService
      .updateProblemStatus(status)
      .pipe(finalize(() => this.isNoteSaved.set(false)))
      .subscribe(() => {
        this.rightPaneService.close();
        this.clearSelectedProblem();
      });
  }

  editNote(problemId: number) {
    this.selectedProblemId = problemId;
    this.isNoteSaved.set(false);
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

  clearSelectedProblem() {
    this.rightPaneService.close();
    this.selectedProblemId = null;
    this.isNoteSaved.set(false);
    this.noteForm.reset({ note: '' });
  }

  getSelectedProblemId() {
    return this.selectedProblemId;
  }

  getNoteTitle() {
    const problem = this.problems().find((problem) => problem.id === this.selectedProblemId);
    return problem?.title ?? '';
  }
}
