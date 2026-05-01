import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
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
import { ProblemStatusApiService } from '../../../modules/home/services/user/question-status-api.service';
import { IProblem } from '../../../modules/home/models/Question';
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

  private readonly problemDrillService = inject(ProblemDrillService);
  private readonly questionStatusService = inject(ProblemStatusApiService);

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
    this.questionStatusService.updateProblemStatus(status).subscribe();
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

  editNote(problemId: number) {
    // TODO: Implement note editing functionality
    console.log('Edit note for problem:', problemId);
  }
}
