import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule } from '@angular/forms';
import { compareProblemsByOrder } from '../../../modules/home/models/Question';
import { PublicProblemService } from '../../services/public-api/problem.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-tag-based-problem-list',
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './tag-based-problem-list.html',
  styleUrl: './tag-based-problem-list.scss',
})
export class TagBasedProblemList implements OnInit {
  selectedControl = input(new FormControl<number[]>([], { nonNullable: true }));
  problemsSelected = output<number[]>();

  readonly searchTerm = signal('');
  readonly selectedTagId = signal<number | null>(null);
  readonly selectedProblemIds = signal<Set<number>>(new Set());

  private readonly problemService = inject(PublicProblemService);
  private readonly destroyRef = inject(DestroyRef);
  problems = this.problemService.problems;

  readonly filteredProblems = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    const tagId = this.selectedTagId();

    return this.problems()
      .filter((problem) => {
        if (tagId !== null && !problem.tags.includes(tagId)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return problem.title.toLowerCase().includes(normalizedSearch);
      })
      .sort(compareProblemsByOrder);
  });

  ngOnInit(): void {
    this.problemService.fetchProblems().subscribe();
    const control = this.selectedControl();
    this.syncSelectedIds(control.value ?? []);
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.syncSelectedIds(value ?? []));
  }

  toggleProblemSelection(problemId: number) {
    const selected = new Set(this.selectedProblemIds());
    if (selected.has(problemId)) {
      selected.delete(problemId);
    } else {
      selected.add(problemId);
    }
    this.selectedProblemIds.set(selected);
    this.selectedControl().setValue(Array.from(selected));
  }

  isSelected(problemId: number): boolean {
    return this.selectedProblemIds().has(problemId);
  }

  selectTag(tagId: number | null) {
    this.selectedTagId.set(this.selectedTagId() === tagId ? null : tagId);
  }

  confirmSelection() {
    this.problemsSelected.emit(Array.from(this.selectedProblemIds()));
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value ?? '');
  }

  private syncSelectedIds(ids: number[]) {
    this.selectedProblemIds.set(new Set(ids));
  }
}
