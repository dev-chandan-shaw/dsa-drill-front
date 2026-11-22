import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { IBlogPost, IBlogPostSummary } from '../../shared/models/blog-post';
import { IBlogSection } from '../../shared/models/blog-section';
import { BlogService } from '../../shared/services/public-api/blog.service';

export interface SectionContent {
  section: IBlogSection | null;
  posts: IBlogPostSummary[];
}

export interface PostContent {
  post: IBlogPost | null;
  posts: IBlogPostSummary[];
}

/**
 * Preloads blog data before the route renders on the server so SSR outputs
 * full HTML and final meta tags. In the browser it resolves immediately; the
 * page components fetch through BlogService and show skeletons, so clicking a
 * link navigates instantly instead of waiting for the API.
 */
export const resolveBlogSections: ResolveFn<IBlogSection[] | null> = () => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return of(null);
  }
  return inject(BlogService)
    .fetchSections()
    .pipe(catchError(() => of([] as IBlogSection[])));
};

export const resolveSectionPosts: ResolveFn<SectionContent | null> = (
  route: ActivatedRouteSnapshot,
) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return of(null);
  }
  const blogService = inject(BlogService);
  const sectionSlug = route.paramMap.get('sectionSlug') ?? '';
  return forkJoin({
    sections: blogService
      .fetchSections()
      .pipe(catchError(() => of([] as IBlogSection[]))),
    posts: blogService
      .fetchPosts(sectionSlug)
      .pipe(catchError(() => of([] as IBlogPostSummary[]))),
  }).pipe(
    map(({ sections, posts }) => ({
      section: sections.find((section) => section.slug === sectionSlug) ?? null,
      posts,
    })),
  );
};

export const resolveBlogPost: ResolveFn<PostContent | null> = (
  route: ActivatedRouteSnapshot,
) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return of(null);
  }
  const blogService = inject(BlogService);
  const sectionSlug = route.paramMap.get('sectionSlug') ?? '';
  const postSlug = route.paramMap.get('postSlug') ?? '';
  return forkJoin({
    post: blogService
      .fetchPostDetail(sectionSlug, postSlug)
      .pipe(catchError(() => of(null))),
    posts: blogService
      .fetchPosts(sectionSlug)
      .pipe(catchError(() => of([] as IBlogPostSummary[]))),
  }).pipe(map(({ post, posts }) => ({ post, posts })));
};
