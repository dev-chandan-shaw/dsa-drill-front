import { HttpClient } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { forkJoin, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IProblem } from '../home/models/Question';
import { findSubject } from './library-catalog';
import {
  ArticleDraft,
  ArticleSummary,
  articlePath,
  LibraryArticle,
  LibraryTree,
  SaveArticleDraft,
  PatternEntry,
} from './library.models';

interface Content {
  id: number;
  slug: string;
  summary: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  version?: number;
  hasUnpublishedChanges?: boolean;
  updatedAt?: string;
  coverImageUrl?: string | null;
}
interface Pattern extends Content {
  name: string;
  explanation: string;
  primaryTagId: number | null;
  tagIds: number[];
  problemIds: number[];
  practiceProblems?: IProblem[];
}
interface Design extends Content {
  title: string;
  bodyMarkdown?: string;
  readMinutes?: number;
  level: 'HLD' | 'LLD';
  kind: 'CONCEPT' | 'CASE_STUDY';
  urlLocked?: boolean;
}
type ContentKind = 'pattern' | 'design';
const kindFor = (subject: string): ContentKind => (subject === 'dsa' ? 'pattern' : 'design');
const designSection = (kind: Design['kind']) => (kind === 'CONCEPT' ? 'concepts' : 'case-studies');
const endpoint = (kind: ContentKind) => (kind === 'pattern' ? 'problem-patterns' : 'system-design');
export const editorId = (article: Pick<ArticleSummary, 'id' | 'subject'>) =>
  article.subject === 'dsa' ? `p-${article.id}` : String(article.id);

function summary(row: Pattern | Design): ArticleSummary {
  const pattern = 'name' in row;
  const body = pattern ? row.explanation : row.bodyMarkdown;
  const updatedAt = row.updatedAt ?? '';
  return {
    id: row.id,
    slug: row.slug,
    title: pattern ? row.name : row.title,
    subject: pattern ? 'dsa' : row.level.toLowerCase(),
    section: pattern ? 'patterns' : designSection(row.kind),
    excerpt: row.summary,
    coverImageUrl: row.coverImageUrl,
    groupId: null,
    displayOrder: 0,
    readMinutes: (!pattern ? row.readMinutes : undefined) ??
      (body?.trim() ? Math.ceil(body.trim().split(/\s+/).length / 220) : 0),
    updatedAt,
    publishedAt: row.status === 'PUBLISHED' ? updatedAt || 'published' : null,
    unpublishedChanges: !!row.hasUnpublishedChanges,
  };
}
function draft(row: Pattern | Design): ArticleDraft {
  const a = summary(row),
    pattern = 'name' in row;
  return {
    ...a,
    content: pattern ? row.explanation : (row.bodyMarkdown ?? ''),
    coverImageUrl: row.coverImageUrl ?? null,
    version: row.version ?? 0,
    primaryTagId: pattern ? row.primaryTagId : null,
    tagIds: pattern ? row.tagIds : [],
    problemIds: pattern ? row.problemIds : [],
    relatedArticleIds: [],
    published: row.status === 'PUBLISHED',
    everPublished: pattern ? true : !!row.urlLocked,
    savedAt: row.updatedAt ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly http = inject(HttpClient);
  private readonly transfer = inject(TransferState);
  private readonly platform = inject(PLATFORM_ID);
  private readonly trees = new Map<string, LibraryTree>();
  private readonly articles = new Map<string, LibraryArticle>();
  private patternCache: PatternEntry[] | null = null;
  private get<T>(kind: ContentKind, path = '', admin = false) {
    const resource = `${endpoint(kind)}${path}`;
    if (admin) return this.http.get<T>(`${environment.apiUrl}/admin/${resource}`, { transferCache: false });

    // SSR may use a different API origin; use the public resource path to bridge hydration.
    const key = makeStateKey<T | null>(`library:${resource}`);
    const errorKey = makeStateKey<number>(`library-status:${resource}`);
    const status = this.transfer.get(errorKey, 0);
    if (status) {
      this.transfer.remove(errorKey);
      return throwError(() => ({ status }));
    }
    const cached = this.transfer.get(key, null);
    if (cached !== null) {
      this.transfer.remove(key);
      return of(cached);
    }
    return this.http.get<T>(`${environment.apiUrl}/public/${resource}`, { transferCache: false }).pipe(
      tap({
        next: value => { if (isPlatformServer(this.platform)) this.transfer.set(key, value); },
        error: error => { if (isPlatformServer(this.platform)) this.transfer.set(errorKey, error.status === 404 ? 404 : 503); },
      }),
    );
  }
  cachedTree(subject: string, section: string) {
    return this.trees.get(`${subject}/${section}`) ?? null;
  }
  cachedArticle(subject: string, section: string, slug: string) {
    return this.articles.get(`${subject}/${section}/${slug}`) ?? null;
  }
  cachedPatterns() {
    return this.patternCache;
  }
  patterns() {
    return this.get<Pattern[]>('pattern').pipe(
      map((rows) => rows.map((row) => ({ summary: summary(row), tagIds: row.tagIds }))),
      tap((rows) => (this.patternCache = rows)),
    );
  }
  tree(subject: string, section: string) {
    const key = `${subject}/${section}`;
    const source =
      subject === 'dsa'
        ? this.patterns().pipe(map((rows) => rows.map((r) => r.summary)))
        : this.get<Design[]>('design', `?level=${encodeURIComponent(subject.toUpperCase())}`).pipe(
            map((rows) => rows.filter((r) => designSection(r.kind) === section).map(summary)),
          );
    return source.pipe(
      map((articles) => ({
        subject,
        section,
        groups: articles.length
          ? [
              {
                id: 0,
                parentId: null,
                title: '',
                displayOrder: 0,
                version: null,
                children: [],
                articles,
              },
            ]
          : [],
      })),
      tap((tree) => this.trees.set(key, tree)),
    );
  }
  designOverview(subject: string) {
    return this.get<Design[]>('design', `?level=${encodeURIComponent(subject.toUpperCase())}`).pipe(
      map(rows => ({
        subject, section: '',
        groups: (findSubject(subject)?.sections ?? []).map((section, index) => ({
          id:index, parentId:null, title:section.title, displayOrder:index, version:null,
          children:[], articles:rows.filter(row => designSection(row.kind) === section.code).map(summary),
        })),
      })),
    );
  }
  article(subject: string, section: string, slug: string) {
    const source: Observable<Pattern | Design> =
      subject === 'dsa'
        ? this.get<Pattern>('pattern', `/by-slug/${encodeURIComponent(slug)}`)
        : this.get<Design>(
            'design',
            `/${encodeURIComponent(subject.toUpperCase())}/${encodeURIComponent(slug)}`,
          );
    return source.pipe(
      map((row) => {
        const a = summary(row);
        if (a.subject !== subject || a.section !== section) throw { status: 404 };
        return {
          summary: a,
          content: 'name' in row ? row.explanation : (row.bodyMarkdown ?? ''),
          coverImageUrl: row.coverImageUrl ?? null,
          tagIds: 'name' in row ? row.tagIds : [],
          breadcrumbs: [],
          problems: 'name' in row ? (row.practiceProblems ?? []) : [],
          relatedArticles: [],
          previous: null,
          next: null,
        };
      }),
      tap({
        next: (a) => this.articles.set(`${subject}/${section}/${slug}`, a),
        error: () => this.articles.delete(`${subject}/${section}/${slug}`),
      }),
    );
  }
  resolve(path: string) {
    if (path === '/question-pattern') return of({ path: '/library/dsa/patterns' });
    if (path === '/system-design') return of({ path: '/library/hld' });
    const pattern = path.match(/^\/question-pattern\/([^/]+)(?:\/(\d+)(\/questions)?)?$/);
    if (pattern) {
      if (!pattern[2]) return of({ path: `/library/dsa/patterns/topics/${pattern[1]}` });
      return this.get<Pattern>('pattern', `/${pattern[1]}/${pattern[2]}`).pipe(
        map((row) => ({
          path: articlePath(summary(row)) + (pattern[3] ? '#linked-questions' : ''),
        })),
      );
    }
    const design = path.match(/^\/system-design\/(hld|lld)(?:\/([^/]+))?$/i);
    if (design) {
      const level = design[1].toUpperCase();
      return design[2]
        ? this.get<Design>('design', `/${level}/${design[2]}`).pipe(
            map((row) => ({ path: articlePath(summary(row)) })),
          )
        : of({ path: `/library/${level.toLowerCase()}` });
    }
    return throwError(() => ({ status: 404 }));
  }
  legacyArticle(type: string, id: string) {
    return type === 'pattern' && /^\d+$/.test(id)
      ? of({ path: `/admin/articles/p-${id}/edit` })
      : throwError(() => ({ status: 404 }));
  }
  adminArticles() {
    return forkJoin({
      patterns: this.get<Pattern[]>('pattern', '', true),
      design: this.get<Design[]>('design', '', true),
    }).pipe(map(({ patterns, design }) => [...patterns, ...design].map(summary)));
  }
  draft(id: number, kind: ContentKind = 'design') {
    return this.get<Pattern | Design>(kind, `/${id}`, true).pipe(map(draft));
  }
  saveDraft(id: number | null, body: SaveArticleDraft) {
    const kind = kindFor(body.subject),
      base = `${environment.apiUrl}/admin/${endpoint(kind)}`;
    const request =
      kind === 'pattern'
        ? {
            id,
            name: body.title,
            summary: body.excerpt,
            explanation: body.content,
            primaryTagId: body.primaryTagId ?? body.tagIds[0] ?? null,
            tagIds: body.tagIds,
            problemIds: body.problemIds,
            coverImageUrl: body.coverImageUrl,
            version: body.version,
          }
        : {
            title: body.title,
            slug: body.slug || slugify(body.title),
            summary: body.excerpt,
            bodyMarkdown: body.content,
            level: body.subject.toUpperCase(),
            kind: body.section === 'concepts' ? 'CONCEPT' : 'CASE_STUDY',
            coverImageUrl: body.coverImageUrl,
            version: body.version,
          };
    return (
      id === null || kind === 'pattern'
        ? this.http.post<Pattern | Design>(base, request)
        : this.http.put<Pattern | Design>(`${base}/${id}`, request)
    ).pipe(map(draft));
  }
  publish(id: number, version: number, kind: ContentKind = 'design') {
    return this.publication(id, version, kind, 'publish');
  }
  unpublish(id: number, version: number, kind: ContentKind = 'design') {
    return this.publication(id, version, kind, 'unpublish');
  }
  private publication(id: number, version: number, kind: ContentKind, action: string) {
    return this.http
      .post<Pattern | Design>(
        `${environment.apiUrl}/admin/${endpoint(kind)}/${id}/${action}`,
        null,
        { params: { version } },
      )
      .pipe(
        map(draft),
        tap(() => {
          this.trees.clear();
          this.articles.clear();
          this.patternCache = null;
        }),
      );
  }
}

function slugify(title: string) {
  return (
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140)
      .replace(/-$/, '') || 'article'
  );
}
