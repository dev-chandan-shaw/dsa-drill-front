import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IProblem } from '../../../modules/home/models/Question';
import { IProblemTag } from '../../../modules/home/models/question-tag';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tag-based-problem-list',
  imports: [CommonModule, InputTextModule, ButtonModule, FormsModule],
  templateUrl: './tag-based-problem-list.html',
  styleUrl: './tag-based-problem-list.scss',
})
export class TagBasedProblemList {
  problems = input.required<IProblem[]>();
  tags = input.required<IProblemTag[]>();
  selectionMode = input<'single' | 'multiple'>('single');
  problemsSelected = output<number[]>();

  readonly searchTerm = signal('');
  readonly selectedTagId = signal<number | null>(null);
  readonly selectedProblemIds = signal<Set<number>>(new Set());

  readonly filteredProblems = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    const tagId = this.selectedTagId();

    return this.problems().filter((problem) => {
      if (tagId !== null && !problem.tags.includes(tagId)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return problem.title.toLowerCase().includes(normalizedSearch);
    });
  });

  readonly problemCountByTag = computed(() => {
    const counts = new Map<number, number>();
    for (const problem of this.problems()) {
      for (const tagId of problem.tags) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  });

  toggleProblemSelection(problemId: number) {
    const selected = this.selectedProblemIds();
    if (this.selectionMode() === 'single') {
      this.selectedProblemIds.set(new Set([problemId]));
    } else {
      if (selected.has(problemId)) {
        selected.delete(problemId);
      } else {
        selected.add(problemId);
      }
      this.selectedProblemIds.set(new Set(selected));
    }
  }

  isSelected(problemId: number): boolean {
    return this.selectedProblemIds().has(problemId);
  }

  selectTag(tagId: number | null) {
    this.selectedTagId.set(this.selectedTagId() === tagId ? null : tagId);
  }

  getTagName(tagId: number): string {
    return this.tags().find((t) => t.id === tagId)?.name ?? 'Unknown';
  }

  confirmSelection() {
    this.problemsSelected.emit(Array.from(this.selectedProblemIds()));
  }

  handleSearchInput(event: any) {
    this.searchTerm.set(event.target?.value || '');
  }
}
