import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule } from '@angular/forms';
import { ProblemTagService } from '../../services/public-api/proglem-tag.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Tag counterpart of TagBasedProblemList: search + checkbox rows bound to a
// caller-owned FormControl<number[]>. Ticks write straight into the control,
// so hosts (pattern editor panes) observe them with zero glue code.
@Component({
  selector: 'app-tag-picker',
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './tag-picker.html',
  styleUrl: './tag-picker.scss',
})
export class TagPicker implements OnInit {
  selectedControl = input(new FormControl<number[]>([], { nonNullable: true }));

  readonly searchTerm = signal('');
  readonly selectedTagIds = signal<Set<number>>(new Set());

  private readonly tagService = inject(ProblemTagService);
  private readonly destroyRef = inject(DestroyRef);
  tags = this.tagService.problemTags;

  readonly filteredTags = computed(() => {
    const normalizedSearch = this.searchTerm().toLowerCase().trim();
    if (!normalizedSearch) {
      return this.tags();
    }
    return this.tags().filter((tag) => tag.name.toLowerCase().includes(normalizedSearch));
  });

  ngOnInit(): void {
    this.tagService.fetchProblemTags().subscribe();
    const control = this.selectedControl();
    this.syncSelectedIds(control.value ?? []);
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.syncSelectedIds(value ?? []));
  }

  toggleTagSelection(tagId: number) {
    const selected = new Set(this.selectedTagIds());
    if (selected.has(tagId)) {
      selected.delete(tagId);
    } else {
      selected.add(tagId);
    }
    this.selectedTagIds.set(selected);
    this.selectedControl().setValue(Array.from(selected));
  }

  isSelected(tagId: number): boolean {
    return this.selectedTagIds().has(tagId);
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value ?? '');
  }

  private syncSelectedIds(ids: number[]) {
    this.selectedTagIds.set(new Set(ids));
  }
}
