import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IProblem } from '../../../modules/home/models/Question';

@Component({
  selector: 'app-problem-filter',
  imports: [CommonModule, InputTextModule, ButtonModule],
  templateUrl: './problem-filter.html',
  styleUrl: './problem-filter.scss',
})
export class ProblemFilter {
  problems = input.required<IProblem[]>();
  selectedProblems = output<number[]>();
  selectionMode = input<'single' | 'multiple'>('single');

  readonly searchTerm = signal('');
  readonly selectedIds = signal<Set<number>>(new Set());

  readonly filteredProblems = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    if (!normalizedSearch) {
      return this.problems();
    }

    return this.problems().filter((problem) =>
      problem.title.toLowerCase().includes(normalizedSearch),
    );
  });

  toggleSelection(problemId: number) {
    const selected = this.selectedIds();
    if (this.selectionMode() === 'single') {
      this.selectedIds.set(new Set([problemId]));
    } else {
      if (selected.has(problemId)) {
        selected.delete(problemId);
      } else {
        selected.add(problemId);
      }
      this.selectedIds.set(new Set(selected));
    }
  }

  isSelected(problemId: number): boolean {
    return this.selectedIds().has(problemId);
  }

  confirm() {
    this.selectedProblems.emit(Array.from(this.selectedIds()));
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  handleSearchInput(event: any) {
    this.setSearchTerm(event.target?.value || '');
  }
}
