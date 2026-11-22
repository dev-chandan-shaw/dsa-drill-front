import { HttpClient } from '@angular/common/http';
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import {
  ArticleDraft, ArticleSummary, LibraryArticle, LibraryTree, SaveArticleDraft, PatternEntry,
} from './library.models';

@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly http = inject(HttpClient);
  private readonly transfer = inject(TransferState);
  private readonly platform = inject(PLATFORM_ID);
  private readonly publicUrl = `${environment.apiUrl}/public/library`;
  private readonly adminUrl = `${environment.apiUrl}/admin/library`;
  private readonly trees = new Map<string, LibraryTree>();
  private patternCache: PatternEntry[] | null = null;
  private readonly articleCache = new Map<string, LibraryArticle>();

  // TransferState bridges SSR hydration; later navigations fetch fresh publication data.
  private publicGet<T>(path: string): Observable<T> {
    const key = makeStateKey<T | null>(`library:${path}`);
    const cached = this.transfer.get(key, null);
    if (cached !== null) {
      this.transfer.remove(key);
      return of(cached);
    }
    return this.http.get<T>(`${this.publicUrl}${path}`).pipe(tap((value) => {
      if (isPlatformServer(this.platform)) this.transfer.set(key, value);
    }));
  }

  legacyArticle(type: string, id: string) { return this.http.get<{ path: string }>(`${this.adminUrl}/legacy/${type}/${id}`); }
  cachedTree(subject: string, section: string): LibraryTree | null {
    return this.trees.get(`${subject}/${section}`) ?? null;
  }
  tree(subject: string, section: string, admin = false) {
    const path = `/subjects/${encodeURIComponent(subject)}/sections/${encodeURIComponent(section)}/tree`;
    return admin ? this.http.get<LibraryTree>(`${this.adminUrl}${path}`) : this.publicGet<LibraryTree>(path).pipe(
      tap((tree) => this.trees.set(`${subject}/${section}`, tree)),
    );
  }
  cachedArticle(subject: string, section: string, slug: string): LibraryArticle | null {
    return this.articleCache.get(`${subject}/${section}/${slug}`) ?? null;
  }
  article(subject: string, section: string, slug: string) {
    return this.publicGet<LibraryArticle>(`/articles/${encodeURIComponent(subject)}/${encodeURIComponent(section)}/${encodeURIComponent(slug)}`).pipe(
      tap((article) => this.articleCache.set(`${subject}/${section}/${slug}`, article)),
    );
  }
  resolve(path: string) {
    return this.http.get<{ path: string }>(`${this.publicUrl}/resolve`, { params: { path } });
  }
  adminArticles() { return this.http.get<ArticleSummary[]>(`${this.adminUrl}/articles`); }
  cachedPatterns(): PatternEntry[] | null { return this.patternCache; }
  patterns() {
    return this.publicGet<PatternEntry[]>('/patterns').pipe(tap((patterns) => { this.patternCache = patterns; }));
  }
  draft(id: number) { return this.http.get<ArticleDraft>(`${this.adminUrl}/articles/${id}`); }
  saveDraft(id: number | null, body: SaveArticleDraft) {
    return id === null
      ? this.http.post<ArticleDraft>(`${this.adminUrl}/articles`, body)
      : this.http.put<ArticleDraft>(`${this.adminUrl}/articles/${id}/draft`, body);
  }
  publish(id: number, version: number) {
    return this.http.post<ArticleDraft>(`${this.adminUrl}/articles/${id}/publish`, { version });
  }
  unpublish(id: number, version: number) {
    return this.http.post<ArticleDraft>(`${this.adminUrl}/articles/${id}/unpublish`, { version });
  }}
