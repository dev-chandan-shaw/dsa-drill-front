import { Component, inject, linkedSignal, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { UserQuestionStatusDto } from '../../../modules/home/models/Question-status';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProblemDrillService } from '../../../modules/home/services/problem-drill.service';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProblemStatusApiService } from '../../../modules/home/services/question-status-api.service';
import { ProblemService } from '../../../modules/home/services/question.service';
import { ToastService } from '../../services/toast-service';
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
  ],
  templateUrl: './problem-list.html',
  styleUrl: './problem-list.scss',
})
export class ProblemList implements OnInit {
  stateOptions = [
    { label: 'All', value: 'all' },
    { label: 'Revision', value: 'revision' },
  ];

  value = 'all';

  private readonly problemService = inject(ProblemService);
  private readonly problemDrillService = inject(ProblemDrillService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly toastService = inject(ToastService);

  problems = this.problemService.problems;
  filteredProblems = linkedSignal(() => this.problems());
  problemStatuses = this.questionStatusService.problemStatuses;

  ngOnInit(): void {
    this.problemDrillService.init(this.problems());
  }

  pickRandom() {
    const problem = this.problemDrillService.next();
    if (!problem) return;
    globalThis.open(problem.link, '_blank');
  }

  filterRevision(value: string) {
    if (value === this.value) {
      this.value = 'all';
    }
    if (value === 'all') this.filteredProblems.set(this.problems());
    else
      this.filteredProblems.set(
        this.problems().filter((p) => this.problemStatuses()[p.id]?.revision),
      );
  }

  toggleMarkForRevision(problemId: number) {
    const isMarked = !this.problemStatuses()[problemId]?.revision;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      revision: isMarked,
    };
    this.questionStatusService.updateProblemStatus(status).subscribe({
      error: (error) => {
        this.toastService.showError('Failed to update problem status', error.message);
      },
    });
  }

  toggleSolved(problemId: number) {
    const isSolved = !this.problemStatuses()[problemId]?.solved;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      solved: isSolved,
    };
    this.questionStatusService.updateProblemStatus(status).subscribe({
      error: (error) => {
        this.toastService.showError('Failed to update problem status', error.message);
      },
    });
  }

  editNote(problemId: number) {
    // TODO: Implement note editing functionality
    console.log('Edit note for problem:', problemId);
  }
}
