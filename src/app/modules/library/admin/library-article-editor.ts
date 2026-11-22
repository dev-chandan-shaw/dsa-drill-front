import { DatePipe } from '@angular/common';
import { afterRenderEffect, Component, DestroyRef, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, TemplateRef, ViewChild, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { MarkdownView } from '../../../shared/components/markdown-view/markdown-view';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { SeoService } from '../../../shared/services/seo.service';
import { IProblem } from '../../home/models/Question';
import { LibraryApi } from '../library-api.service';
import { ArticleDraft, ArticleSummary, articlePath, SaveArticleDraft } from '../library.models';
import { articleSections, LIBRARY_CATALOG } from '../library-catalog';
import { MarkdownArticleEditor } from './markdown-article-editor';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RightPaneService, RightPaneSize } from '../../../shared/services/right-pane-service';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';
import { IProblemTag } from '../../home/models/question-tag';
import { CoverUploader } from '../../../shared/components/cover-uploader/cover-uploader';
import { MarkdownService } from '../../../shared/services/markdown.service';

@Component({
  selector: 'app-library-article-editor',
  imports: [RouterLink, ReactiveFormsModule, DatePipe, MarkdownArticleEditor, MarkdownView, CoverUploader, CdkTextareaAutosize, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './library-article-editor.html', styleUrls: ['../library.scss', './library-article-editor.scss'],
})
export class LibraryArticleEditor implements OnInit, OnDestroy {
  @ViewChild(MarkdownArticleEditor) private bodyEditor?: MarkdownArticleEditor;
  @ViewChild('publishSettings') private publishSettings!: TemplateRef<unknown>;
  private readonly titleInput = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');
  private focusTitleOnOpen = true;
  private readonly rightPane = inject(RightPaneService);
  private readonly tagsApi = inject(ProblemTagService);
  private readonly api = inject(LibraryApi);
  private readonly problemsApi = inject(PublicProblemService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly markdown = inject(MarkdownService);
  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setTimeout>;
  private saveChain: Promise<void> = Promise.resolve();
  private editSequence = 0;
  private savedSequence = 0;
  private allowDiscard = false;
  private destroyed = false;

  readonly draft = signal<ArticleDraft | null>(null);
  readonly articleOptions = signal<ArticleSummary[]>([]);
  readonly problems = signal<IProblem[]>([]);
  readonly tags = signal<IProblemTag[]>([]);
  readonly questionSearch = signal('');
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly publishing = signal(false);
  readonly articleHasImage = signal(false);
  readonly coverUploading = signal(false);
  readonly preview = signal(false);
  readonly conflict = signal(false);
  readonly error = signal('');
  readonly saveState = signal<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  readonly subjects = LIBRARY_CATALOG;
  readonly sections = articleSections;
  readonly form = this.fb.group({
    subject: this.fb.nonNullable.control(''), section: this.fb.nonNullable.control(''), slug: this.fb.nonNullable.control(''),
    title: this.fb.nonNullable.control(''), excerpt: this.fb.nonNullable.control(''),
    content: this.fb.nonNullable.control(''), coverImageUrl: this.fb.control<string | null>(null),
    groupId: this.fb.control<number | null>(null), displayOrder: this.fb.nonNullable.control(0),
    problemIds: this.fb.nonNullable.control<number[]>([]), relatedArticleIds: this.fb.nonNullable.control<number[]>([]),
    tagIds: this.fb.nonNullable.control<number[]>([]),
  });
  readonly path = articlePath;

  constructor() {
    afterRenderEffect(() => {
      const title = this.titleInput();
      if (title && !this.loading() && this.focusTitleOnOpen) {
        this.focusTitleOnOpen = false;
        title.nativeElement.focus({ preventScroll: true });
      }
    });
  }

  ngOnInit() {
    this.seo.setPageMeta({ title: 'Write an article - DSA Drill', description: 'Library article editor.', robots: 'noindex' });
    forkJoin({ articles: this.api.adminArticles(), problems: this.problemsApi.fetchProblems(), tags: this.tagsApi.fetchProblemTags() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => {
          this.articleOptions.set(data.articles); this.problems.set(data.problems); this.tags.set(data.tags);
          this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id !== 'new' && Number(id) === this.draft()?.id) return;
            void this.open(id);
          });
        },
        error: () => { this.loading.set(false); this.loadFailed.set(true); this.error.set('Unable to load the editor. Reload this page to try again.'); },
      });
    this.form.controls.subject.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((subject) => {
      const first = this.sections.find((section) => section.subject === subject);
      this.form.controls.section.setValue(first?.code ?? '');
    });
    this.form.controls.section.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.groupId.setValue(null, { emitEvent: false });
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.loading()) return;
      this.editSequence++; this.saveState.set('unsaved');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { void this.saveDraft().catch(() => {}); }, 1000);
    });
  }

  private async open(id: string | null) {
    this.focusTitleOnOpen = true;
    this.loading.set(true); this.loadFailed.set(false); this.error.set(''); this.conflict.set(false); clearTimeout(this.timer);
    try {
      if (id === 'new') {
        this.draft.set(null); this.form.enable({ emitEvent: false });
        const requestedSubject = this.route.snapshot.queryParamMap.get('subject');
        const requestedSection = this.route.snapshot.queryParamMap.get('section');
        const section = this.sections.find((s) => s.subject === requestedSubject && s.code === requestedSection) ?? this.sections[0];
        this.form.reset({ subject: section?.subject ?? '', section: section?.code ?? '', slug: '', title: '', excerpt: '', content: '', coverImageUrl: null,
          groupId: null, displayOrder: 0, problemIds: [], relatedArticleIds: [], tagIds: [] }, { emitEvent: false });
      } else {
        if (!id || !/^\d+$/.test(id)) throw new Error('Article not found.');
        const data = await firstValueFrom(this.api.draft(Number(id)));
        this.draft.set(data); this.form.enable({ emitEvent: false });
        this.form.reset({ subject: data.subject, section: data.section, slug: data.slug, title: data.title, excerpt: data.excerpt ?? '',
          content: data.content, coverImageUrl: data.coverImageUrl, groupId: data.groupId, displayOrder: data.displayOrder,
          problemIds: data.problemIds, relatedArticleIds: data.relatedArticleIds, tagIds: data.tagIds ?? [] }, { emitEvent: false });
        this.lockIdentity(data);
      }
      this.editSequence = 0; this.savedSequence = 0; this.saveState.set('saved');
    } catch (error) { this.loadFailed.set(true); this.error.set(this.message(error, 'Unable to load this article.')); }
    finally { this.loading.set(false); }
  }

  sectionOptions() { return this.sections.filter((section) => section.subject === this.form.controls.subject.value); }
  isPattern() { return this.form.controls.subject.value === 'dsa' && this.form.controls.section.value === 'patterns'; }
  filteredQuestions() {
    const search = this.questionSearch().trim().toLowerCase();
    const selected = new Set(this.form.controls.problemIds.value);
    return this.problems().filter((p) => selected.has(p.id) || p.title.toLowerCase().includes(search));
  }
  beginPublish() {
    if (this.publishing() || this.coverUploading()) return;
    this.bodyEditor?.flush();
    this.articleHasImage.set(/<img\b[^>]*\bsrc=["'][^"']+["']/i.test(this.markdown.render(this.form.controls.content.value)));
    this.error.set('');
    this.rightPane.open(this.publishSettings, RightPaneSize.MEDIUM, { title: 'Publish article' });
  }
  closePublishSettings() { if (!this.publishing() && !this.coverUploading()) this.rightPane.close(); }
  onCoverUploadChange(uploading: boolean) {
    this.coverUploading.set(uploading);
    this.rightPane.disableClose = uploading || this.publishing();
  }
  needsCover(): boolean {
    return !this.form.controls.coverImageUrl.value?.trim()
      && !/<img\b[^>]*\bsrc=["'][^"']+["']/i.test(this.markdown.render(this.form.controls.content.value));
  }

  /** Serialize requests, but read the current form and server version at execution time. */
  saveDraft(): Promise<void> {
    this.bodyEditor?.flush();
    clearTimeout(this.timer);
    const operation = this.saveChain.catch(() => {}).then(() => this.persist());
    this.saveChain = operation;
    return operation;
  }
  private async persist() {
    if (this.destroyed || this.editSequence === this.savedSequence) return;
    if (this.conflict()) throw new Error('Reload the latest version before saving.');
    if (!this.form.controls.subject.value || !this.form.controls.section.value) throw new Error('Choose a subject and section.');
    const sequence = this.editSequence;
    const body: SaveArticleDraft = { ...this.form.getRawValue(), version: this.draft()?.version ?? null };
    this.saveState.set('saving'); this.error.set('');
    try {
      const saved = await firstValueFrom(this.api.saveDraft(this.draft()?.id ?? null, body));
      if (this.destroyed) return;
      this.draft.set(saved); this.lockIdentity(saved); this.savedSequence = sequence;
      if (this.form.controls.slug.value === body.slug) this.form.controls.slug.setValue(saved.slug, { emitEvent: false });
      this.saveState.set(this.editSequence === sequence ? 'saved' : 'unsaved');
      if (!this.publishing()) this.syncRoute();
    } catch (error) {
      const message = this.message(error, 'Draft could not be saved. Your edits are still here.');
      this.error.set(message); this.saveState.set('error');
      if (message.includes('another session')) this.conflict.set(true);
      throw error;
    }
  }
  async saveNow() { try { await this.saveDraft(); } catch {} }
  async publish() {
    if (this.publishing() || this.coverUploading()) return;
    if (this.needsCover()) {
      this.error.set('Upload a cover image or add an image to the article before publishing.'); return;
    }
    if (!this.sectionOptions().some((section) => section.code === this.form.controls.section.value)) {
      this.error.set('Choose a subject and subsection before publishing.'); return;
    }
    if (this.isPattern() && !this.form.controls.tagIds.value.length) {
      this.error.set('Select at least one question tag before publishing a pattern.'); return;
    }
    this.publishing.set(true); this.form.disable({ emitEvent: false });
    this.rightPane.disableClose = true;
    try {
      await this.saveDraft();
      const draft = this.draft();
      if (!draft) throw new Error('Write an article before publishing.');
      const saved = await firstValueFrom(this.api.publish(draft.id, draft.version));
      this.draft.set(saved); this.lockIdentity(saved); this.error.set('');
      this.rightPane.close();
    } catch (error) { this.error.set(this.message(error, 'Publishing failed. Your draft is saved separately from the public article.')); }
    finally { this.form.enable({ emitEvent: false }); if (this.draft()) this.lockIdentity(this.draft()!); this.publishing.set(false); this.rightPane.disableClose = false; this.syncRoute(); }
  }
  async unpublish() {
    if (this.publishing()) return;
    this.publishing.set(true); this.form.disable({ emitEvent: false });
    try {
      await this.saveDraft(); const draft = this.draft(); if (!draft) return;
      this.draft.set(await firstValueFrom(this.api.unpublish(draft.id, draft.version)));
    } catch (error) { this.error.set(this.message(error, 'Unable to unpublish.')); }
    finally { this.form.enable({ emitEvent: false }); if (this.draft()) this.lockIdentity(this.draft()!); this.publishing.set(false); this.syncRoute(); }
  }
  private lockIdentity(draft: ArticleDraft) {
    if (draft.everPublished) {
      this.form.controls.subject.disable({ emitEvent: false }); this.form.controls.section.disable({ emitEvent: false }); this.form.controls.slug.disable({ emitEvent: false });
    }
  }
  private syncRoute() {
    if (this.draft() && this.route.snapshot.paramMap.get('id') === 'new')
      void this.router.navigate(['/admin/articles', this.draft()!.id, 'edit'], { replaceUrl: true });
  }
  async importMarkdown(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    try {
      const content = await file.text();
      this.form.controls.content.setValue(content);
      if (!this.form.controls.title.value.trim()) this.form.controls.title.setValue(file.name.replace(/\.(md|markdown)$/i, '').replace(/[-_]/g, ' '));
    } catch { this.error.set('This Markdown file could not be read. Try selecting it again.'); }
    input.value = '';
  }
  exportMarkdown() {
    this.bodyEditor?.flush();
    const url = URL.createObjectURL(new Blob([this.form.controls.content.value], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${this.form.controls.slug.value || 'article'}.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  togglePreview() { this.bodyEditor?.flush(); this.preview.set(!this.preview()); }
  async reload() { if (this.draft()) await this.open(String(this.draft()!.id)); else window.location.reload(); }
  leaveWithoutSaving() { this.allowDiscard = true; void this.router.navigate(['/admin/articles']); }
  async canLeave(): Promise<boolean> {
    if (this.allowDiscard) return true;
    if (this.publishing() || this.coverUploading()) return false;
    try { await this.saveDraft(); return true; } catch { return false; }
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    this.bodyEditor?.flush();
    if (!this.allowDiscard && (this.editSequence !== this.savedSequence || this.publishing() || this.coverUploading())) { event.preventDefault(); event.returnValue = ''; }
  }
  private message(error: unknown, fallback: string) {
    const value = error as { error?: { message?: string }; message?: string };
    return value?.error?.message ?? (error instanceof Error && !('status' in error) ? error.message : fallback);
  }
  ngOnDestroy() { this.destroyed = true; clearTimeout(this.timer); if (this.rightPane.template === this.publishSettings) this.rightPane.close(); }
}
