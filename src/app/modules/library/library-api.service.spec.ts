import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProblemDifficulty } from '../home/models/Question';
import { LibraryApi } from './library-api.service';

describe('Library API integration', () => {
  const base = environment.apiUrl;
  let api: LibraryApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(LibraryApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses canonical ordered questions from the public pattern detail', () => {
    const questions = [9, 4].map((id) => ({
      id,
      title: `Question ${id}`,
      link: 'https://example.com',
      difficulty: ProblemDifficulty.Easy,
      tags: [],
      order: id,
    }));
    api.article('dsa', 'patterns', 'two-pointers-7').subscribe((article) => {
      expect(article.summary.id).toBe(7);
      expect(article.problems.map((p) => p.id)).toEqual([9, 4]);
    });
    http.expectOne(`${base}/public/problem-patterns/by-slug/two-pointers-7`).flush({
      id: 7,
      slug: 'two-pointers-7',
      name: 'Two Pointers',
      status: 'PUBLISHED',
      explanation: 'Practice',
      tagIds: [2],
      problemIds: [9, 4],
      practiceProblems: questions,
    });
  });

  it('keeps concepts and case studies in their configured section', () => {
    api.tree('lld', 'case-studies').subscribe((tree) => {
      expect(tree.groups[0].articles.map((a) => a.slug)).toEqual(['parking-lot']);
      expect(tree.groups[0].articles[0].readMinutes).toBe(6);
    });
    http.expectOne(`${base}/public/system-design?level=LLD`).flush([
      {
        id: 7,
        slug: 'strategy',
        title: 'Strategy',
        level: 'LLD',
        kind: 'CONCEPT',
        status: 'PUBLISHED',
      },
      {
        id: 8,
        slug: 'parking-lot',
        title: 'Parking Lot',
        level: 'LLD',
        kind: 'CASE_STUDY',
        status: 'PUBLISHED',
        readMinutes: 6,
      },
    ]);
  });

  it('reuses article content on revisit until the cache expires', () => {
    const url = `${base}/public/system-design/LLD/parking-lot`;
    const load = () => api.article('lld', 'case-studies', 'parking-lot');
    load().subscribe((article) => expect(article.content).toBe('Published Markdown'));
    http.expectOne(url).flush({
      id: 8,
      slug: 'parking-lot',
      title: 'Parking Lot',
      level: 'LLD',
      kind: 'CASE_STUDY',
      status: 'PUBLISHED',
      bodyMarkdown: 'Published Markdown',
    });

    load().subscribe((article) => expect(article.content).toBe('Published Markdown'));
    http.expectNone(url);

    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60 * 1000);
    try {
      load().subscribe({ error: (error) => expect(error.status).toBe(404) });
      http.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' });
      expect(api.cachedArticle('lld', 'case-studies', 'parking-lot')).toBeNull();
    } finally {
      now.mockRestore();
    }
  });

  it('updates existing patterns privately without using the design article ID namespace', () => {
    api
      .saveDraft(7, {
        title: 'Two Pointers',
        slug: 'two-pointers-7',
        subject: 'dsa',
        section: 'patterns',
        version: 3,
        coverImageUrl: null,
        excerpt: '',
        content: 'Draft Markdown',
        tagIds: [2],
        primaryTagId: 2,
        problemIds: [9, 4],
        relatedArticleIds: [],
        groupId: null,
        displayOrder: 0,
      })
      .subscribe((result) => expect(result.unpublishedChanges).toBe(true));
    const save = http.expectOne(`${base}/admin/problem-patterns`);
    expect(save.request.method).toBe('POST');
    expect(save.request.body).toMatchObject({
      id: 7,
      version: 3,
      primaryTagId: 2,
      problemIds: [9, 4],
    });
    expect(save.request.body.status).toBeUndefined();
    save.flush({
      id: 7,
      slug: 'two-pointers-7',
      name: 'Two Pointers',
      status: 'PUBLISHED',
      explanation: 'Draft Markdown',
      version: 4,
      hasUnpublishedChanges: true,
      tagIds: [2],
      problemIds: [9, 4],
    });
  });
});
