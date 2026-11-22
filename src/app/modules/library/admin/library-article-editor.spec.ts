import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { LibraryArticleEditor } from './library-article-editor';
import { LibraryApi } from '../library-api.service';
import { ArticleDraft } from '../library.models';
import { PublicProblemService } from '../../../shared/services/public-api/problem.service';
import { SeoService } from '../../../shared/services/seo.service';
import { ProblemTagService } from '../../../shared/services/public-api/proglem-tag.service';

describe('Library article autosave and publishing', () => {
  let fixture: ComponentFixture<LibraryArticleEditor>;
  let editor: LibraryArticleEditor;
  const draft: ArticleDraft = { id: 7, version: 3, subject: 'lld', section: 'concepts', slug: 'factory', title: 'Factory',
    content: 'Original', excerpt: '', coverImageUrl: 'https://example.com/cover.png', groupId: 1, displayOrder: 0, problemIds: [], relatedArticleIds: [], tagIds: [],
    published: true, everPublished: true, unpublishedChanges: false, savedAt: '2026-11-12T00:00:00Z' };
  let api: { [key: string]: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    api = {
      adminArticles: vi.fn(() => of([])), draft: vi.fn(() => of(draft)), tree: vi.fn(() => of({ subject: 'lld', section: 'concepts', groups: [] })),
      saveDraft: vi.fn(), publish: vi.fn(), unpublish: vi.fn(),
    };
    await TestBed.configureTestingModule({ imports: [LibraryArticleEditor], providers: [
      { provide: LibraryApi, useValue: api }, { provide: PublicProblemService, useValue: { fetchProblems: () => of([]) } },
      { provide: SeoService, useValue: { setPageMeta: () => {} } },
      { provide: ProblemTagService, useValue: { fetchProblemTags: () => of([{ id: 1, name: 'Arrays', slug: 'arrays' }]) } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })), snapshot: { paramMap: convertToParamMap({ id: '7' }), queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
    ] }).overrideComponent(LibraryArticleEditor, { set: { template: '', imports: [] } }).compileComponents();
    fixture = TestBed.createComponent(LibraryArticleEditor); editor = fixture.componentInstance;
    fixture.detectChanges(); await fixture.whenStable();
  });
  afterEach(() => fixture.destroy());

  it('requires an uploaded cover only when the article has no inline image', async () => {
    editor.form.controls.coverImageUrl.setValue(null);
    expect(editor.needsCover()).toBe(true);
    await editor.publish();
    expect(api['publish']).not.toHaveBeenCalled();
    expect(editor.error()).toContain('Upload a cover image');
    editor.form.controls.content.setValue('![Diagram](https://example.com/diagram.png)\n\nExplanation.');
    expect(editor.needsCover()).toBe(false);
    editor.form.controls.content.setValue('Text-only article.');
    editor.form.controls.coverImageUrl.setValue('https://example.com/uploaded.png');
    expect(editor.needsCover()).toBe(false);
  });

  it('offers a cover upload for image-free articles without mistaking code for images', () => {
    editor.form.controls.content.setValue('An explanation.\n\n```markdown\n![Example](https://example.com/code.png)\n```');
    editor.beginPublish();
    expect(editor.articleHasImage()).toBe(false);
    editor.form.controls.content.setValue('An explanation.\n\n![Diagram][image]\n\n[image]: https://example.com/diagram.png');
    editor.beginPublish();
    expect(editor.articleHasImage()).toBe(true);
  });

  it('saves an uploaded cover before publishing and preserves it in the published draft', async () => {
    const coverImageUrl = 'https://example.com/uploaded-cover.png';
    const saved = { ...draft, coverImageUrl, version: 4 };
    api['saveDraft'].mockReturnValue(of(saved));
    api['publish'].mockReturnValue(of({ ...saved, version: 5 }));
    editor.form.controls.coverImageUrl.setValue(coverImageUrl);
    await editor.publish();
    expect(api['saveDraft'].mock.calls[0][1]).toMatchObject({ coverImageUrl });
    expect(api['publish']).toHaveBeenCalledWith(7, 4);
    expect(editor.draft()?.coverImageUrl).toBe(coverImageUrl);
  });

  it('waits until an in-progress cover upload has completed before allowing publication', async () => {
    editor.onCoverUploadChange(true);
    await editor.publish();
    expect(api['publish']).not.toHaveBeenCalled();
    expect(api['saveDraft']).not.toHaveBeenCalled();
    expect(await editor.canLeave()).toBe(false);
    editor.onCoverUploadChange(false);
    expect(editor.coverUploading()).toBe(false);
  });

  it('serializes autosaves and uses the latest server version for queued edits', async () => {
    const first = new Subject<ArticleDraft>(); const second = new Subject<ArticleDraft>();
    api['saveDraft'].mockReturnValueOnce(first).mockReturnValueOnce(second);
    editor.form.controls.content.setValue('First edit'); const firstSave = editor.saveDraft();
    await Promise.resolve(); await Promise.resolve();
    expect(api['saveDraft']).toHaveBeenCalledTimes(1);
    editor.form.controls.content.setValue('Second edit'); const secondSave = editor.saveDraft();
    first.next({ ...draft, version: 4, content: 'First edit', unpublishedChanges: true }); first.complete();
    await firstSave; await Promise.resolve();
    expect(api['saveDraft'].mock.calls[1][1]).toMatchObject({ version: 4, content: 'Second edit' });
    second.next({ ...draft, version: 5, content: 'Second edit', unpublishedChanges: true }); second.complete();
    await secondSave;
    expect(editor.saveState()).toBe('saved');
    expect(editor.form.controls.content.value).toBe('Second edit');
  });

  it('waits for the latest draft to save before publishing its returned version', async () => {
    const saving = new Subject<ArticleDraft>(); api['saveDraft'].mockReturnValue(saving);
    api['publish'].mockReturnValue(of({ ...draft, version: 5 }));
    editor.form.controls.content.setValue('Ready to publish'); const publishing = editor.publish();
    await Promise.resolve(); await Promise.resolve();
    expect(api['publish']).not.toHaveBeenCalled();
    saving.next({ ...draft, version: 4, content: 'Ready to publish', unpublishedChanges: true }); saving.complete();
    await publishing;
    expect(api['publish']).toHaveBeenCalledWith(7, 4);
  });

  it('keeps local Markdown and stops publication if the draft save fails', async () => {
    api['saveDraft'].mockReturnValue(throwError(() => ({ error: { message: 'Changed in another session' } })));
    editor.form.controls.content.setValue('Do not lose this Markdown'); await editor.publish();
    expect(api['publish']).not.toHaveBeenCalled();
    expect(editor.form.controls.content.value).toBe('Do not lose this Markdown');
    expect(editor.saveState()).toBe('error');
  });

  it('allows pattern drafts without tags but blocks publishing until a tag is selected', async () => {
    editor.form.patchValue({ subject: 'dsa', section: 'patterns', tagIds: [], problemIds: [] });
    api['saveDraft'].mockReturnValue(of({ ...draft, subject: 'dsa', section: 'patterns', tagIds: [], version: 4 }));
    await editor.saveDraft();
    expect(api['saveDraft']).toHaveBeenCalled();
    await editor.publish();
    expect(api['publish']).not.toHaveBeenCalled();
    expect(editor.error()).toContain('at least one question tag');
  });

  it('publishes a tagged pattern without requiring related questions', async () => {
    editor.form.patchValue({ subject: 'dsa', section: 'patterns', tagIds: [1], problemIds: [] });
    const pattern = { ...draft, subject: 'dsa', section: 'patterns', tagIds: [1], version: 4 };
    api['saveDraft'].mockReturnValue(of(pattern));
    api['publish'].mockReturnValue(of({ ...pattern, version: 5 }));
    await editor.publish();
    expect(api['saveDraft'].mock.calls[0][1]).toMatchObject({ tagIds: [1], problemIds: [] });
    expect(api['publish']).toHaveBeenCalledWith(7, 4);
  });
});
