import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticleSummary, articlePath } from './library.models';

@Component({
  selector: 'app-article-list-item',
  imports: [RouterLink, DatePipe],
  template: `
    <a class="article-list-item" [routerLink]="path(article())">
      <div class="article-copy">
        <div class="article-meta">
          <span>{{ article().section === 'case-studies' ? 'Case study' : article().section === 'patterns' ? 'Pattern' : 'Concept' }}</span>
          @if (article().readMinutes > 0) {
            <span>{{ article().readMinutes }} min read</span>
          }
        </div>
        <h2>{{ article().title || 'Untitled article' }}</h2>
        @if (article().previewText || article().excerpt; as preview) {
          <p>{{ preview }}</p>
        }
        @if (article().updatedAt) {
          <small>Updated {{ article().updatedAt | date: 'MMM d, y' }}</small>
        }
      </div>
      @if (article().coverImageUrl; as cover) {
        <img [src]="cover" alt="" loading="lazy" decoding="async" />
      }
    </a>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .article-list-item { display: flex; align-items: center; gap: 24px; padding: 20px 0; color: var(--library-ink); text-decoration: none; }
    .article-copy { flex: 1; min-width: 0; }
    .article-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 7px; color: var(--library-muted); font-size: 12px; }
    h2 { margin: 0; font: 650 20px/1.35 system-ui, -apple-system, sans-serif; letter-spacing: -0.3px; overflow-wrap: anywhere; }
    p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; margin: 7px 0 0; color: var(--library-muted); font: 14px/1.55 system-ui, -apple-system, sans-serif; overflow-wrap: anywhere; }
    small { display: block; margin-top: 10px; color: var(--library-muted); font-size: 12px; }
    img { flex: 0 0 104px; width: 104px; height: 78px; border-radius: 6px; object-fit: cover; background: var(--library-soft); }
    a:hover h2 { color: var(--library-accent); }
    a:focus-visible { outline: 2px solid var(--library-accent); outline-offset: 4px; }
    @media (max-width: 560px) {
      .article-list-item { gap: 16px; padding: 20px 0; }
      h2 { font-size: 18px; }
      p { font-size: 14px; }
      img { flex-basis: 84px; width: 84px; height: 72px; }
    }
  `,
})
export class ArticleListItem {
  readonly article = input.required<ArticleSummary>();
  readonly path = articlePath;
}
