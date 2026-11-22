import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary, articlePath } from './library.models';

@Component({
  selector: 'app-article-list-item',
  imports: [RouterLink],
  template: `
    <a class="article-list-item" [routerLink]="path(article())">
      <div class="article-copy">
        <h2>{{ article().title || 'Untitled article' }}</h2>
        @if (article().previewText || article().excerpt; as preview) {
          <p>{{ preview }}</p>
        }
      </div>
      @if (article().coverImageUrl; as cover) {
        <img [src]="cover" alt="" loading="lazy" decoding="async" />
      }
    </a>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .article-list-item { display: flex; align-items: center; gap: 28px; padding: 24px 0; color: var(--library-ink); text-decoration: none; }
    .article-copy { flex: 1; min-width: 0; }
    h2 { margin: 0; font: 750 24px/1.25 system-ui, -apple-system, sans-serif; letter-spacing: -0.5px; overflow-wrap: anywhere; }
    p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; margin: 10px 0 0; color: var(--library-muted); font: 17px/1.55 system-ui, -apple-system, sans-serif; overflow-wrap: anywhere; }
    img { flex: 0 0 120px; width: 120px; height: 90px; object-fit: cover; background: var(--library-soft); }
    a:focus-visible { outline: 2px solid var(--library-accent); outline-offset: 4px; }
    @media (max-width: 560px) {
      .article-list-item { gap: 16px; padding: 20px 0; }
      h2 { font-size: 21px; }
      p { font-size: 16px; }
      img { flex-basis: 84px; width: 84px; height: 72px; }
    }
  `,
})
export class ArticleListItem {
  readonly article = input.required<ArticleSummary>();
  readonly path = articlePath;
}
