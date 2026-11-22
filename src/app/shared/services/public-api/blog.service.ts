import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IBlogSection } from '../../models/blog-section';
import { IBlogPost, IBlogPostSummary } from '../../models/blog-post';

const SECTIONS_KEY = makeStateKey<IBlogSection[]>('blog-sections');
const postsKey = (sectionSlug: string) =>
  makeStateKey<IBlogPostSummary[]>(`blog-posts-${sectionSlug}`);
const postKey = (sectionSlug: string, postSlug: string) =>
  makeStateKey<IBlogPost>(`blog-post-${sectionSlug}-${postSlug}`);

/**
 * Public System Design blog API. Read-only and SSR-safe: server responses ride
 * TransferState into the hydrated client, and a small in-session cache keeps
 * back/forward and hub <-> section visits from refetching. Pass `force` to
 * bypass both caches after an edit.
 */
@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private readonly api = environment.apiUrl + '/public';
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);

  private sectionsCache: IBlogSection[] | null = null;
  private readonly postsCache = new Map<string, IBlogPostSummary[]>();
  private readonly postDetailCache = new Map<string, IBlogPost>();

  fetchSections(force = false): Observable<IBlogSection[]> {
    if (!force) {
      if (this.sectionsCache) {
        return of(this.sectionsCache);
      }
      const cached = this.transferState.get(SECTIONS_KEY, null);
      if (cached) {
        this.sectionsCache = cached;
        this.transferState.remove(SECTIONS_KEY);
        return of(cached);
      }
    }
    this.transferState.remove(SECTIONS_KEY);
    return this.http.get<IBlogSection[]>(`${this.api}/blog-sections`).pipe(
      tap((sections) => {
        this.sectionsCache = sections;
        this.transferState.set(SECTIONS_KEY, sections);
      }),
    );
  }

  fetchPosts(sectionSlug: string, force = false): Observable<IBlogPostSummary[]> {
    const key = postsKey(sectionSlug);
    if (!force) {
      const cached = this.postsCache.get(sectionSlug);
      if (cached) {
        return of(cached);
      }
      const transferred = this.transferState.get(key, null);
      if (transferred) {
        this.postsCache.set(sectionSlug, transferred);
        this.transferState.remove(key);
        return of(transferred);
      }
    }
    this.transferState.remove(key);
    return this.http
      .get<IBlogPostSummary[]>(`${this.api}/blog-posts`, {
        params: { section: sectionSlug },
      })
      .pipe(
        tap((posts) => {
          this.postsCache.set(sectionSlug, posts);
          this.transferState.set(key, posts);
        }),
      );
  }

  fetchPostDetail(
    sectionSlug: string,
    postSlug: string,
    force = false,
  ): Observable<IBlogPost> {
    const cacheKey = `${sectionSlug}/${postSlug}`;
    const key = postKey(sectionSlug, postSlug);
    if (!force) {
      const cached = this.postDetailCache.get(cacheKey);
      if (cached) {
        return of(cached);
      }
      const transferred = this.transferState.get(key, null);
      if (transferred) {
        this.postDetailCache.set(cacheKey, transferred);
        this.transferState.remove(key);
        return of(transferred);
      }
    }
    this.transferState.remove(key);
    return this.http
      .get<IBlogPost>(
        `${this.api}/blog-posts/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(postSlug)}`,
      )
      .pipe(
        tap((post) => {
          this.postDetailCache.set(cacheKey, post);
          this.transferState.set(key, post);
        }),
      );
  }
}
