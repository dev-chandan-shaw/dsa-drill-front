import { afterNextRender, Component, effect, inject, input, OnDestroy, signal, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { filter, firstValueFrom, map, Subscription } from 'rxjs';
import type { Crepe } from '@milkdown/crepe';
import { ImageUploadService } from '../../../shared/services/image-upload.service';
import { DOCUMENT } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-markdown-article-editor',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="article-markdown-editor">
      <!-- <div class="writing-tools">
        <span>Markdown shortcuts work as you write.</span>
        <button type="button" (click)="toggleSource()" [attr.aria-pressed]="source()">{{ source() ? 'Formatted view' : 'Markdown source' }}</button>
      </div> -->
      @if (error()) { <p class="editor-load-error" role="alert">{{ error() }}</p> }
      @if (!ready() && !source()) { <p role="status" class="editor-hint">Preparing the editor…</p> }
      <div #editorRoot [hidden]="source()" aria-label="Article body"></div>
      @if (source()) {
        <mat-form-field appearance="outline" class="source-field"><mat-label>Markdown source</mat-label>
          <textarea matInput class="markdown-source" spellcheck="false" [disabled]="readonly()"
            [value]="control().value" (input)="setSource($any($event.target).value)"></textarea>
        </mat-form-field>
      }
    </div>
  `,
  styles: `
    .article-markdown-editor .writing-tools { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; font:12px/1.5 system-ui; color:var(--library-muted); margin-bottom:18px; }
    .article-markdown-editor .writing-tools button { color:inherit; background:none; border:0; text-decoration:underline; cursor:pointer; padding:6px 0; }
    .article-markdown-editor .editor-load-error { font:14px/1.5 system-ui; color:var(--mat-sys-error); }
    .article-markdown-editor .editor-hint { color:var(--library-muted); font:14px system-ui; padding:16px 0; }
    .article-markdown-editor .source-field { width:100%; }
    .article-markdown-editor textarea.markdown-source { width:100%; min-height:520px; resize:vertical; color:var(--library-ink); background:transparent; font:14px/1.8 'JetBrains Mono',monospace; }
    .article-markdown-editor .milkdown {
      --crepe-color-background:var(--library-paper); --crepe-color-on-background:var(--library-ink);
      --crepe-color-surface:var(--library-paper); --crepe-color-surface-low:var(--library-soft);
      --crepe-color-on-surface:var(--library-ink); --crepe-color-on-surface-variant:var(--library-muted);
      --crepe-color-outline:var(--library-line); --crepe-color-primary:var(--library-accent);
      --crepe-color-secondary:var(--library-soft); --crepe-color-on-secondary:var(--library-ink);
      --crepe-color-inverse:var(--library-ink); --crepe-color-on-inverse:var(--library-paper);
      --crepe-color-inline-code:var(--library-ink); --crepe-color-error:var(--mat-sys-error);
      --crepe-color-hover:var(--library-soft); --crepe-color-selected:var(--library-line); --crepe-color-inline-area:var(--library-soft);
      --crepe-base-font-size:21px; --crepe-font-title:Georgia,serif; --crepe-font-default:Georgia,serif;
      --crepe-font-code:'JetBrains Mono',monospace; --crepe-shadow-1:0 3px 14px #0001; --crepe-shadow-2:0 4px 18px #0002;
      background:var(--library-paper); color:var(--library-ink);
    }
    .article-markdown-editor .milkdown .ProseMirror { padding:0 0 160px; min-height:540px; font:21px/1.75 Georgia,serif; outline:0; }
    .article-markdown-editor .milkdown .ProseMirror p { margin:0 0 .8em; padding:0; line-height:1.75; }
    .article-markdown-editor .milkdown .ProseMirror .label-wrapper:has(> .label.bullet) { flex:none; height:1lh; width:1em; }
    .article-markdown-editor .milkdown .ProseMirror .label-wrapper > .label.bullet { display:grid; place-items:center; width:100%; height:100%; padding:0; color:var(--library-ink); }
    .article-markdown-editor .milkdown .ProseMirror .label.bullet svg { fill:currentColor; }
    .article-markdown-editor .milkdown .ProseMirror h2 { font-size:29px; }
    .article-markdown-editor .milkdown .ProseMirror h3 { font-size:24px; }
    .article-markdown-editor .milkdown .milkdown-toolbar { font-family:system-ui,sans-serif; }
    .article-markdown-editor .milkdown .cm-editor { font:14px/1.65 'JetBrains Mono',monospace; color:var(--library-ink); }
    .article-markdown-editor .milkdown .cm-gutters { background:var(--library-soft); color:var(--library-muted); }
    .article-markdown-editor .milkdown .cm-content .cm-line, .article-markdown-editor .milkdown .cm-content .cm-line span { color:var(--library-ink); }
    .article-markdown-editor .milkdown .cm-activeLineGutter { background:var(--library-line); color:var(--library-ink); }
    @media(max-width:760px) { .article-markdown-editor .milkdown .ProseMirror { font-size:19px; } }
  `,
})
export class MarkdownArticleEditor implements OnDestroy {
  control = input.required<FormControl<string>>();
  readonly = input(false);
  @ViewChild('editorRoot', { static: true }) root!: ElementRef<HTMLElement>;
  private readonly uploads = inject(ImageUploadService);
  private readonly document = inject(DOCUMENT);
  private instance: Crepe | null = null;
  private subscription?: Subscription;
  private replaceValue: ((value: string) => void) | null = null;
  private changing = false;
  private destroyed = false;
  private lastEditorMarkdown: string | null = null;
  readonly source = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => this.instance?.setReadonly(this.readonly()));
    afterNextRender(() => { void this.mount(); });
  }
  private async mount() {
    try {
      await this.loadStyles();
      const [{ Crepe, CrepeFeature }, { replaceAll }, { createArticleInsertMenu, articleToolbar }, { articleHeadingBehavior }, { articleListBehavior, articleListItemConfig }, { articleUnderline }] = await Promise.all([
        import('@milkdown/crepe'), import('@milkdown/kit/utils'), import('./article-editor-menus'), import('./article-heading-behavior'),
        import('./article-list-behavior'), import('./article-underline'),
      ]);
      if (this.destroyed) return;
      const upload = async (file: File) => {
        this.error.set('');
        try {
          return await firstValueFrom(this.uploads.upload(file, 'library').pipe(
            filter((event) => event.type === HttpEventType.Response), map((event) => event.body!.url),
          ));
        } catch { this.error.set('Image upload failed. Try uploading the image again.'); throw new Error('Image upload failed'); }
      };
      const instance = new Crepe({ root: this.root.nativeElement, defaultValue: this.control().value,
        features: { [CrepeFeature.AI]: false, [CrepeFeature.Latex]: false, [CrepeFeature.TopBar]: false, [CrepeFeature.BlockEdit]: false },
        featureConfigs: {
          [CrepeFeature.ImageBlock]: { onUpload: upload, inlineOnUpload: upload, blockOnUpload: upload },
          [CrepeFeature.Placeholder]: { text: 'Tell the reader what matters…' },
          [CrepeFeature.CodeMirror]: { theme: [] },
          [CrepeFeature.Cursor]: { virtual: false },
          [CrepeFeature.ListItem]: articleListItemConfig,
          [CrepeFeature.Toolbar]: articleToolbar,
        },
      });
      instance.editor.use(createArticleInsertMenu(upload)).use(articleHeadingBehavior).use(articleListBehavior).use(articleUnderline);
      instance.on((listener) => listener.markdownUpdated((_ctx, markdown) => {
        this.commit(markdown);
      }));
      await instance.create();
      if (this.destroyed) { await instance.destroy(); return; }
      this.instance = instance; instance.setReadonly(this.readonly());
      this.lastEditorMarkdown = instance.getMarkdown();
      this.replaceValue = (value) => { instance.editor.action(replaceAll(value)); this.lastEditorMarkdown = instance.getMarkdown(); };
      this.subscription = this.control().valueChanges.subscribe((value) => {
        if (!this.changing && !this.source() && value !== instance.getMarkdown()) {
          this.changing = true; this.replaceValue?.(value); this.changing = false;
        }
      });
      this.ready.set(true);
    } catch {
      this.error.set('The formatted editor could not load. Your Markdown is available in source view.'); this.source.set(true);
    }
  }
  toggleSource() {
    this.flush();
    if (this.source()) { this.changing = true; this.replaceValue?.(this.control().value); this.changing = false; }
    this.source.set(!this.source());
  }
  // Milkdown debounces change events. Explicit actions must include the very
  // latest keystroke, even when the 200 ms listener delay has not elapsed.
  flush() { if (this.instance && this.ready() && !this.source()) this.commit(this.instance.getMarkdown()); }
  private commit(markdown: string) {
    if (markdown === this.lastEditorMarkdown) return;
    this.lastEditorMarkdown = markdown;
    if (!this.ready() || this.changing || this.source() || markdown === this.control().value) return;
    this.changing = true; this.control().setValue(markdown); this.control().markAsDirty(); this.changing = false;
  }
  private loadStyles(): Promise<void> {
    const existing = this.document.querySelector<HTMLLinkElement>('link[data-library-editor]');
    if (existing?.sheet) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = existing ?? this.document.createElement('link');
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => { link.remove(); reject(new Error('Editor styles could not load')); }, { once: true });
      if (!existing) {
        link.rel = 'stylesheet'; link.href = '/library-editor.css?v=3'; link.dataset['libraryEditor'] = '';
        this.document.head.appendChild(link);
      }
    });
  }
  setSource(value: string) { this.control().setValue(value); this.control().markAsDirty(); }
  ngOnDestroy() { this.destroyed = true; this.subscription?.unsubscribe(); void this.instance?.destroy(); }
}
