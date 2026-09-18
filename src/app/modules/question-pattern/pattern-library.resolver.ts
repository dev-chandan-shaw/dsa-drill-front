import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { ProblemPatternService } from '../../shared/services/public-api/problem-pattern.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';

/**
 * Preloads the pattern library (tags, patterns, problems) before the route
 * renders. On the server this makes the navigation wait for the API, so
 * crawlers receive full HTML *and* final per-page meta tags — effects and
 * subscriptions alone cannot do that, they resolve after SSR output.
 * Failures resolve false so pages render their error states instead.
 */
export const resolvePatternLibrary: ResolveFn<boolean> = () => {
  const tags = inject(ProblemTagService);
  const patterns = inject(ProblemPatternService);
  const problems = inject(PublicProblemService);
  return forkJoin([
    tags.fetchProblemTags().pipe(catchError(() => of([]))),
    patterns.fetchProblemPatterns().pipe(catchError(() => of([]))),
    problems.fetchProblems().pipe(catchError(() => of([]))),
  ]).pipe(map(() => true));
};
