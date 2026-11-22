import { inject, PLATFORM_ID, RESPONSE_INIT } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { LibraryApi } from './library-api.service';
import { CatalogSection, CatalogSubject, findSection, findSubject, LIBRARY_CATALOG } from './library-catalog';
import { LibraryArticle, LibraryTree } from './library.models';

export interface LibraryPageData {
  subjects: CatalogSubject[];
  subject: CatalogSubject | null;
  section: CatalogSection | null;
  tree: LibraryTree | null;
  error: string | null;
}
export interface LibraryReaderData extends LibraryPageData { article: LibraryArticle | null; }

export const resolveLibraryPage: ResolveFn<LibraryPageData> = (route) => {
  const api = inject(LibraryApi);
  const response = inject(RESPONSE_INIT, { optional: true });
  const failed = (message: string, status: number) => {
    if (response) response.status = status;
    return { subjects: LIBRARY_CATALOG, subject: null, section: null, tree: null, error: message };
  };
  const code = route.paramMap.get('subject');
  if (!code) return of({ subjects: LIBRARY_CATALOG, subject: null, section: null, tree: null, error: null });
  const subject = findSubject(code);
  const section = findSection(code, route.paramMap.get('section') ?? subject?.sections[0]?.code);
  if (!subject || !section) return of(failed('This library section does not exist.', 404));
  return of({ subjects: LIBRARY_CATALOG, subject, section, tree: api.cachedTree(subject.code, section.code), error: null });
};

export const resolveLibraryArticle: ResolveFn<LibraryReaderData | RedirectCommand> = (route) => {
  const api = inject(LibraryApi);
  const response = inject(RESPONSE_INIT, { optional: true });
  const subjectCode = route.paramMap.get('subject')!;
  const sectionCode = route.paramMap.get('section')!;
  const subject = findSubject(subjectCode);
  const section = findSection(subjectCode, sectionCode);
  // Activate browser routes immediately; the reader loads or refreshes its own content.
  // SSR still resolves the full article for the initial HTML and status code.
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return of({ subjects: LIBRARY_CATALOG, subject, section,
      tree: api.cachedTree(subjectCode, sectionCode),
      article: api.cachedArticle(subjectCode, sectionCode, route.paramMap.get('slug')!), error: null });
  }
  return forkJoin({
    tree: api.tree(subjectCode, sectionCode),
    article: api.article(subjectCode, sectionCode, route.paramMap.get('slug')!),
  }).pipe(map((data) => ({ ...data, subjects: LIBRARY_CATALOG, subject, section, error: null })),
    catchError((error) => {
      if (response) response.status = error.status === 404 ? 404 : 503;
      return of({ subjects: LIBRARY_CATALOG, subject, section, tree: null, article: null,
        error: error.status === 404 ? 'This article does not exist or is not published.' : 'Unable to load this article. Please try again.' });
    }));
};

/** Older bookmarks use the migration's explicit route map; unmapped pages retain their existing UI. */
export const legacyLibraryRedirect: CanActivateFn = (_route, state) => {
  const api = inject(LibraryApi);
  const router = inject(Router);
  return api.resolve(state.url.split('?')[0]).pipe(
    map((result) => new RedirectCommand(router.parseUrl(result.path), { replaceUrl: true })),
    catchError(() => of(true)),
  );
};

export const legacyAdminArticleRedirect: CanActivateFn = (route) => {
  const api = inject(LibraryApi); const router = inject(Router);
  return api.legacyArticle(route.data['sourceType'], route.paramMap.get('id')!).pipe(
    map((result) => new RedirectCommand(router.parseUrl(result.path), { replaceUrl: true })),
    catchError(() => of(true)),
  );
};
