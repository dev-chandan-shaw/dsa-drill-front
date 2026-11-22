import { Component, effect, HostListener, inject, untracked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarkdownNoteEditor } from '../../../shared/components/markdown-note-editor/markdown-note-editor';
import { ReaderState } from './reader-state';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reader-note-pane',
  imports: [MarkdownNoteEditor, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  host: { '[class.open]': '!!reader.paneItem()' },
  template: `@if (reader.paneItem(); as item) {
    <aside aria-label="Private note" [attr.aria-busy]="reader.loading()"
      animate.enter="pane-enter" animate.leave="pane-leave">
      <header>
        <h2>Your note</h2>
        <button mat-icon-button type="button" (click)="reader.close()" matTooltip="Close note" aria-label="Close note"><mat-icon>close</mat-icon></button>
      </header>
      <h3>{{ item.title }}</h3>
      @if (reader.loading()) {
        <div class="loading" role="status"><mat-spinner diameter="28" /><span>Loading note…</span></div>
      } @else if (reader.loadError()) {
        <p role="alert">Could not load this note.</p>
        <button mat-icon-button type="button" (click)="retry()" matTooltip="Retry loading note" aria-label="Retry loading note"><mat-icon>refresh</mat-icon></button>
      } @else {
      <app-markdown-note-editor [control]="control" [fillHeight]="true" [maxLength]="100000" />
      <footer>
        <span role="status">{{
          reader.status() === 'Failed' ? 'Could not save your note.' : reader.status()
        }}</span>
        @if (reader.status() === 'Failed') {
          <button mat-icon-button type="button" (click)="reader.flush()" matTooltip="Retry saving" aria-label="Retry saving"><mat-icon>refresh</mat-icon></button>
          <button mat-icon-button type="button" (click)="reader.discardFailedEdit()" matTooltip="Discard changes" aria-label="Discard changes"><mat-icon>undo</mat-icon></button>
        }
        <button mat-icon-button type="button" (click)="reader.flush()" [disabled]="!reader.pending()" matTooltip="Save note" aria-label="Save note"><mat-icon>save</mat-icon></button>
        <button mat-icon-button type="button" (click)="remove()" [disabled]="!control.value" matTooltip="Delete note" aria-label="Delete note"><mat-icon>delete_outline</mat-icon></button>
      </footer>
      }
    </aside>
  }`,
  styles: `
    :host {
      --pane-width: clamp(280px, 32vw, 480px);
      display: block;
      min-width: 0;
      min-height: 0;
      flex: 0 0 auto;
      width: 0;
      height: 100%;
      overflow: hidden;
      transition: width 220ms cubic-bezier(0.2, 0, 0, 1);
    }
    :host.open {
      width: var(--pane-width);
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    aside {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      width: var(--pane-width);
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: var(--mat-sys-surface, Canvas);
      color: var(--mat-sys-on-surface, CanvasText);
      border-inline-start: 1px solid var(--mat-sys-outline-variant, #ccc);
      padding: 20px;
    }
    header,
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
    }
    app-markdown-note-editor {
      flex: 1;
      min-height: 0;
      height: auto;
    }
    h2 {
      font:
        600 22px Georgia,
        serif;
      margin: 0;
    }
    h3 {
      flex-shrink: 0;
      font-size: 16px;
      margin: 24px 0 12px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    footer {
      margin-top: 16px;
      font-size: 13px;
    }
    .pane-enter {
      animation: pane-in 220ms cubic-bezier(0.2, 0, 0, 1);
    }
    .pane-leave {
      pointer-events: none;
      animation: pane-out 220ms cubic-bezier(0.2, 0, 0, 1);
    }
    @keyframes pane-in {
      from { opacity: 0; transform: translateX(24px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pane-out {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(24px); }
    }
    @media (max-width: 767px) {
      :host {
        --pane-width: min(100vw, 360px);
      }
      aside {
        padding: 12px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host { transition: none; }
      .pane-enter, .pane-leave { animation-duration: 1ms; }
    }
  `,
})
export class NotePane {
  readonly reader = inject(ReaderState);
  readonly control = new FormControl('');
  constructor() {
    effect(() => {
      this.reader.editor();
      this.reader.loading();
      this.control.setValue(untracked(this.reader.text), { emitEvent: false });
    });
    this.control.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((text) => this.reader.edit(text ?? ''));
  }
  async retry() {
    const item = this.reader.paneItem();
    if (item) {
      try { await this.reader.open(item); } catch { /* The pane displays the load error. */ }
    }
  }
  @HostListener('document:keydown.escape')
  closeOnEscape() {
    if (this.reader.paneItem()) void this.reader.close();
  }
  async remove() {
    this.control.setValue('');
    await this.reader.close();
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.reader.pending() || this.reader.status() === 'Saving') {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
