import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MarkdownNoteEditor } from './markdown-note-editor';

describe('MarkdownNoteEditor', () => {
  let component: MarkdownNoteEditor;
  let fixture: ComponentFixture<MarkdownNoteEditor>;
  let dialogOpen: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dialogOpen = vi.fn(() => ({
      afterClosed: () => of([{ target: 'link', text: 'docs', url: 'https://example.com' }]),
    }));
    await TestBed.configureTestingModule({
      imports: [MarkdownNoteEditor, NoopAnimationsModule],
    })
      // MatDialogModule (imported by the component) would shadow the mock
      // with the real service — swap it for the mock at component level.
      .overrideComponent(MarkdownNoteEditor, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: { open: dialogOpen } }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MarkdownNoteEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl<string | null>('hello world'));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the image button for notes (default section)', () => {
    expect(component.allowImages()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Insert image"]'),
    ).toBeNull();
  });

  it('shows the image button for patterns', () => {
    fixture.componentRef.setInput('section', 'patterns');
    fixture.detectChanges();
    expect(component.allowImages()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Insert image"]'),
    ).toBeTruthy();
  });

  it('ignores image inserts for notes', () => {
    component.openInsertDialog('image');
    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('wraps selected text in bold markers', () => {
    const textarea = fixture.nativeElement.querySelector(
      '.md-textarea',
    ) as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Bold"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(component.control().value).toBe('**hello** world');
  });

  it('toggles rendered preview with the eye button', () => {
    expect(fixture.nativeElement.querySelector('.md-preview')).toBeNull();

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Preview"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const preview = fixture.nativeElement.querySelector('.md-preview .markdown-body');
    expect(preview?.innerHTML).toContain('hello world');
    expect(component.previewing()).toBe(true);
  });

  it('inserts dialog result at the cursor', () => {
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Insert link"]',
      ) as HTMLButtonElement
    ).click();

    expect(dialogOpen).toHaveBeenCalled();
    expect(component.control().value).toContain('[docs](https://example.com)');
  });
});
