import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER } from 'rxjs';
import { LibraryApi } from './library-api.service';
import { LibraryArticle } from './library.models';
import { LibraryReaderData, resolveLibraryArticle } from './library.resolvers';

@Component({ template: '<p>Article destination</p>' })
class ArticleDestination {
  readonly page = inject(ActivatedRoute).snapshot.data['library'] as LibraryReaderData;
}

describe('Immediate article navigation', () => {
  const api = {
    cachedTree: vi.fn(() => null),
    cachedArticle: vi.fn<() => LibraryArticle | null>(() => null),
    tree: vi.fn(() => NEVER),
    article: vi.fn(() => NEVER),
  };

  beforeEach(() => {
    api.cachedArticle.mockReturnValue(null);
    api.tree.mockClear();
    api.article.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'library/:subject/:section/:slug', component: ArticleDestination, resolve: { library: resolveLibraryArticle } }]),
      { provide: LibraryApi, useValue: api },
    ] });
  });

  it('opens the destination without waiting for article or tree requests', async () => {
    const harness = await RouterTestingHarness.create();
    const destination = await harness.navigateByUrl('/library/lld/concepts/factory', ArticleDestination);
    expect(harness.routeNativeElement?.textContent).toContain('Article destination');
    expect(destination.page.subject?.code).toBe('lld');
    expect(destination.page.article).toBeNull();
    expect(api.tree).not.toHaveBeenCalled();
    expect(api.article).not.toHaveBeenCalled();
  });

  it('supplies cached article content as soon as the destination opens', async () => {
    const cached = { content: 'Already loaded article.' } as LibraryArticle;
    api.cachedArticle.mockReturnValue(cached);
    const harness = await RouterTestingHarness.create();
    const destination = await harness.navigateByUrl('/library/lld/concepts/factory', ArticleDestination);
    expect(destination.page.article).toBe(cached);
  });
});
