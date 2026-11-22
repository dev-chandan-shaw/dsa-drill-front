import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { LibraryPatterns } from './library-patterns';
import { LibraryApi } from './library-api.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { SeoService } from '../../shared/services/seo.service';
import { ArticleSummary } from './library.models';

describe('Published pattern topic navigation', () => {
  const summary: ArticleSummary = { id: 1, subject: 'dsa', section: 'patterns', slug: 'two-pointers', title: 'Two pointers',
    excerpt: 'Work from both ends.', previewText: 'Move two pointers inward to find a matching pair.', coverImageUrl: 'https://example.com/two-pointers.png',
    groupId: 1, displayOrder: 0, readMinutes: 3, publishedAt: '2026-11-12', updatedAt: '2026-11-12', unpublishedChanges: false };
  const params = new BehaviorSubject(convertToParamMap({}));
  const patterns = vi.fn();

  beforeEach(async () => {
    params.next(convertToParamMap({}));
    patterns.mockReset().mockReturnValue(of([{ summary, tagIds: [1, 2] }]));
    await TestBed.configureTestingModule({ imports: [LibraryPatterns], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: LibraryApi, useValue: { patterns, cachedPatterns: () => null } },
      { provide: ProblemTagService, useValue: { hasLoaded: () => false, problemTags: () => [], fetchProblemTags: () => of([
        { id: 1, name: 'Arrays', slug: 'arrays', coverFrom: '#123456', coverTo: '#654321', coverGlyph: '[]' },
        { id: 2, name: 'Strings', slug: 'strings' }, { id: 3, name: 'Trees', slug: 'trees' },
      ]) } },
      { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
    ] }).compileComponents();
  });

  it('shows every question tag as a banner with its admin-configured cover and topic link', () => {
    const fixture = TestBed.createComponent(LibraryPatterns); fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.pattern-topic')] as HTMLAnchorElement[];
    expect(links.map((link) => link.querySelector('h3')?.textContent)).toEqual(['Arrays', 'Strings', 'Trees']);
    expect(links[0].style.getPropertyValue('--cover-from')).toBe('#123456');
    expect(links[0].style.getPropertyValue('--cover-to')).toBe('#654321');
    expect(links[0].querySelector('.pattern-topic-glyph')?.textContent).toBe('[]');
    expect(links[2].querySelector('.pattern-topic-count')?.textContent).toBe('0 patterns');
    expect(links[0].getAttribute('href')).toBe('/library/dsa/patterns/topics/arrays');
    fixture.destroy();
  });

  it('opens a stable pattern URL from either of its topic pages as navigation changes', () => {
    params.next(convertToParamMap({ topicSlug: 'arrays' }));
    const fixture = TestBed.createComponent(LibraryPatterns); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Arrays patterns');
    expect(fixture.nativeElement.querySelector('.pattern-row a').getAttribute('href')).toBe('/library/dsa/patterns/two-pointers');
    expect(fixture.nativeElement.querySelector('.pattern-row img').getAttribute('src')).toBe(summary.coverImageUrl);
    expect(fixture.nativeElement.querySelector('.pattern-row p').textContent).toBe(summary.previewText);
    expect(fixture.nativeElement.querySelector('.pattern-row').textContent).not.toContain('min read');
    params.next(convertToParamMap({ topicSlug: 'strings' })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Strings patterns');
    expect(fixture.nativeElement.querySelector('.pattern-row a').getAttribute('href')).toBe('/library/dsa/patterns/two-pointers');
    params.next(convertToParamMap({ topicSlug: 'trees' })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pattern-row')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No published patterns');
    fixture.destroy();
  });

  it('recovers from a failed public request', () => {
    patterns.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(LibraryPatterns); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.pattern-topic').length).toBe(3);
    fixture.destroy();
  });
});
