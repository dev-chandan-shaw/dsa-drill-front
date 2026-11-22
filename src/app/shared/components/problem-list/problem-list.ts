import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ProblemStatusApiService } from '../../../modules/home/services/user/question-status-api.service';
import { compareProblemsByOrder, IProblem } from '../../../modules/home/models/Question';
import { ItemActions } from '../../../modules/library/personal/item-actions';
import { ProblemDrillService } from '../../../modules/home/services/problem-drill.service';

@Component({
  selector: 'app-problem-list',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    RouterLink,
    ItemActions,
  ],
  providers: [ProblemDrillService],
  templateUrl: './problem-list.html',
  styleUrl: './problem-list.scss',
})
export class ProblemList {
  private auth = inject(AuthService);
  private statuses = inject(ProblemStatusApiService);
  private drill = inject(ProblemDrillService);
  problems = input.required<IProblem[]>();
  showFilters = input(true);
  preserveOrder = input(false);
  detail = input(false);
  readonly searchTerm = signal('');
  readonly revisionOnly = signal(false);
  readonly problemStatuses = this.statuses.problemStatuses;
  readonly error = signal('');
  readonly filteredProblems = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const rows = this.problems().filter(
      (p) =>
        p.title.toLowerCase().includes(query) &&
        (!this.revisionOnly() || this.problemStatuses()[p.id]?.revision),
    );
    return this.preserveOrder() ? rows : rows.sort(compareProblemsByOrder);
  });
  constructor() {
    effect(() => this.drill.init(this.filteredProblems()));
    effect((cleanup) => {
      if (this.auth.getAuthResolved()() && this.auth.getLoggedInUser()()) {
        const sub = untracked(() => this.statuses.fetchProblemStatuses()).subscribe({
          error: () => this.error.set('Could not load progress.'),
        });
        cleanup(() => sub.unsubscribe());
      }
    });
  }
  pickRandom() {
    const problem = this.drill.next();
    if (problem) globalThis.open(problem.link, '_blank', 'noopener');
  }
  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }
  setRevisionFilter(value: boolean) {
    this.revisionOnly.set(value);
  }
  clearListFilters() {
    this.searchTerm.set('');
    this.revisionOnly.set(false);
  }
  get hasActiveFilters() {
    return !!this.searchTerm().trim() || this.revisionOnly();
  }
  toggleSolved(id: number) {
    this.update(id, 'solved');
  }
  toggleMarkForRevision(id: number) {
    this.update(id, 'revision');
  }
  private update(id: number, field: 'solved' | 'revision') {
    this.error.set('');
    this.statuses
      .setProgress(id, field, !this.problemStatuses()[id]?.[field])
      .subscribe({ error: () => this.error.set('Could not save progress. Try again.') });
  }
  difficultyLabel(value: IProblem['difficulty']) {
    return { EASY: 'Easy', MED: 'Medium', HARD: 'Hard' }[value];
  }
}
