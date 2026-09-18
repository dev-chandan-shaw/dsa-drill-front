import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownView } from '../markdown-view/markdown-view';
import {
  ImageInsertDialog,
  ImageInsertDialogData,
  ImageInsertResult,
} from './image-insert-dialog/image-insert-dialog';

/**
 * LeetCode-style markdown editor: a seamless borderless toolbar over the
 * text area, eye-icon preview, and a floating dialog for link/image insert
 * (Cloudinary upload via browse, drop, or paste).
 * Binds to an existing reactive FormControl<string | null> so host save
 * flows (notes, admin patterns) stay untouched.
 */
@Component({
  selector: 'app-markdown-note-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MarkdownView,
  ],
  templateUrl: './markdown-note-editor.html',
  styleUrl: './markdown-note-editor.scss',
})
export class MarkdownNoteEditor {
  control = input.required<FormControl<string | null>>();
  /** Cloudinary subfolder: 'notes' for problem notes, 'patterns' for admin patterns. */
  section = input('notes');
  label = input('Note');
  /** Minimum body height (e.g. '380px'). Empty keeps the compact default. */
  minHeight = input('');

  private readonly dialog = inject(MatDialog);
  private readonly editorArea = viewChild<ElementRef<HTMLTextAreaElement>>('editorArea');

  readonly previewing = signal(false);
  readonly isDragOver = signal(false);

  togglePreview() {
    this.previewing.update((value) => !value);
  }

  openInsertDialog(target: 'link' | 'image', files?: File[]) {
    const dialogData: ImageInsertDialogData = {
      target,
      section: this.section(),
      selectedText: this.getSelectedText() || (target === 'link' ? 'text' : ''),
      ...(files?.length ? { files } : {}),
    };
    this.dialog
      .open(ImageInsertDialog, {
        data: dialogData,
        width: '480px',
        maxWidth: 'calc(100dvw - 32px)',
      })
      .afterClosed()
      .subscribe((results?: ImageInsertResult[]) => {
        if (results?.length) {
          const snippet = results
            .map((item) =>
              item.target === 'image' ? `![${item.text}](${item.url})` : `[${item.text}](${item.url})`,
            )
            .join('\n');
          this.insertAtCursor(snippet);
        }
      });
  }

  // ---- formatting ----

  wrapInline(before: string, after: string, placeholder = 'text') {
    const area = this.editorArea()?.nativeElement;
    if (!area) return;
    const { value, selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    this.control().setValue(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  prefixLines(prefix: string, placeholder = 'text') {
    const area = this.editorArea()?.nativeElement;
    if (!area) return;
    const { value, selectionStart: start, selectionEnd: end } = area;
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    const blockEnd = end === start ? start : value.indexOf('\n', end);
    const targetEnd = blockEnd === -1 ? value.length : blockEnd;
    const selected = value.slice(blockStart, targetEnd) || placeholder;
    const prefixed = selected
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : prefix + line))
      .join('\n');
    const next = value.slice(0, blockStart) + prefixed + value.slice(targetEnd);
    this.control().setValue(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(blockStart, blockStart + prefixed.length);
    });
  }

  insertCodeBlock() {
    const area = this.editorArea()?.nativeElement;
    if (!area) return;
    const { value, selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || 'code';
    const snippet = `\n\`\`\`\n${selected}\n\`\`\`\n`;
    this.control().setValue(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + 5, start + 5 + selected.length);
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      this.wrapInline('**', '**');
    } else if (key === 'i') {
      event.preventDefault();
      this.wrapInline('*', '*');
    } else if (key === 'k') {
      event.preventDefault();
      this.openInsertDialog('link');
    }
  }

  // ---- drop & paste (delegate to the dialog) ----

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.openInsertDialog('image', [...files]);
    }
  }

  onPaste(event: ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (files?.length && [...files].some((file) => file.type.startsWith('image/'))) {
      event.preventDefault();
      this.openInsertDialog('image', [...files]);
    }
  }

  private insertAtCursor(snippet: string) {
    const area = this.editorArea()?.nativeElement;
    const current = this.control().value ?? '';
    if (!area) {
      this.control().setValue(current ? `${current}\n${snippet}` : snippet);
      return;
    }
    const { selectionStart: start, selectionEnd: end } = area;
    this.control().setValue(current.slice(0, start) + snippet + current.slice(end));
    const caret = start + snippet.length;
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(caret, caret);
    });
  }

  private getSelectedText(): string {
    const area = this.editorArea()?.nativeElement;
    if (!area) return '';
    return area.value.slice(area.selectionStart, area.selectionEnd);
  }
}
