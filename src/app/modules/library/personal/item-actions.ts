import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ItemType, ReaderState } from './reader-state';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-item-actions',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `<button
      mat-icon-button
      type="button"
      [disabled]="busy() || loading()"
      [attr.aria-pressed]="saved()"
      [matTooltip]="saved() ? 'Remove from saved' : 'Save item'"
      [attr.aria-label]="saved() ? 'Remove from saved' : 'Save item'"
      (click)="toggle()"
    >
      <mat-icon>{{ saved() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
    </button>
    <button mat-icon-button type="button" (click)="open()"
      [matTooltip]="hasNote() ? 'Edit note' : 'Add note'"
      [attr.aria-label]="hasNote() ? 'Edit note' : 'Add note'">
      <mat-icon>{{ hasNote() ? 'edit_note' : 'note_add' }}</mat-icon>
    </button>
    @if (error()) {
      <small role="alert">{{ error() }}</small>
    }`,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.4rem;
      align-items: center;
      flex-wrap: wrap;
    }
    button[aria-pressed='true'] {
      color: var(--mat-sys-primary);
    }
    small {
      font-size: 12px;
    }
  `,
})
export class ItemActions {
  type = input.required<ItemType>();
  id = input.required<string | number>();
  title = input.required<string>();
  row = input(false);
  questionNote = input<string | undefined>();
  private reader = inject(ReaderState);
  private item = computed(() => ({
    type: this.type(),
    id: String(this.id()),
    title: this.title(),
  }));
  private bookmarked = signal(false);
  hasNote = signal(false);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  saved = computed(() =>
    this.type() === 'PROBLEM' ? this.reader.bookmarks().has(+this.id()) : this.bookmarked(),
  );
  constructor() {
    effect((cleanup) => {
      const item = this.item(),
        user = this.reader.user(),
        ready = this.reader.resolved(),
        row = this.row();
      this.bookmarked.set(false);
      this.hasNote.set(false);
      this.error.set('');
      this.loading.set(false);
      if (!ready || !user) return;
      if (row) {
        this.hasNote.set(!!this.questionNote()?.trim());
        return;
      }
      this.loading.set(true);
      const sub = this.reader.state(item).subscribe({
        next: (s) => {
          this.loading.set(false);
          this.bookmarked.set(!!s.savedAt);
          this.hasNote.set(!!s.note?.trim());
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not load personal state.');
        },
      });
      cleanup(() => sub.unsubscribe());
    });
    effect(() => {
      const change = this.reader.changed(),
        item = this.item();
      if (change?.item.type === item.type && change.item.id === item.id) {
        if (change.field === 'note') this.hasNote.set(!!change.value);
        else this.bookmarked.set(!!change.value);
      }
    });
  }
  async toggle() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.reader.bookmark(this.item(), !this.saved());
    } catch {
      this.error.set('Could not update bookmark. Try again.');
    } finally {
      this.busy.set(false);
    }
  }
  async open() {
    try {
      await this.reader.open(this.item());
    } catch {
      this.error.set('Could not open note. Try again.');
    }
  }
}
