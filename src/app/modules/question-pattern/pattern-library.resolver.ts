import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';

/**
 * Preloads the pattern library (tags, patterns, problems) on the server, so
 * crawlers receive full HTML *and* final per-page meta tags. In the browser
 * the resolver returns immediately: the pages already fetch through their
 * services and render skeletons, so navigation never waits on the API.
 */
export const resolvePatternLibrary: ResolveFn<boolean> = () => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return of(true);
  }
  const tags = inject(ProblemTagService);
  const patterns = inject(ProblemPatternService);
  const problems = inject(PublicProblemService);
  return forkJoin([
    tags.fetchProblemTags().pipe(catchError(() => of([]))),
    patterns.fetchProblemPatterns().pipe(catchError(() => of([]))),
    problems.fetchProblems().pipe(catchError(() => of([]))),
  ]).pipe(map(() => true));
};
