import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { articlePath, LibraryGroup } from './library.models';
import { ArticleListItem } from './article-list-item';

@Component({
  selector: 'app-library-tree',
  imports: [RouterLink, NgTemplateOutlet, ArticleListItem],
  template: `
    <ng-template #branch let-groups>
      @for (group of groups; track group.id) {
        <section class="topic-group" [class.compact-topic]="compact()" [id]="'group-' + group.id">
          
          <ul>
            @for (article of group.articles; track article.id) {
              <li>
                @if (compact()) {
                <a [routerLink]="path(article)" [attr.aria-current]="activeId() === article.id ? 'page' : null">
                  <span>{{ article.title || 'Untitled article' }}</span>
                </a>
                } @else {
                  <app-article-list-item [article]="article" />
                }
              </li>
            }
          </ul>
          @if (group.children.length) {
            <div class="subgroups"><ng-container [ngTemplateOutlet]="branch" [ngTemplateOutletContext]="{ $implicit: group.children }" /></div>
          }
        </section>
      }
    </ng-template>
    <ng-container [ngTemplateOutlet]="branch" [ngTemplateOutletContext]="{ $implicit: groups() }" />
  `,
  styles: `
    :host { display: block; }
    .topic-group { margin-bottom: 36px; scroll-margin-top: 24px; }
    h2 { margin: 0 0 12px; font: 600 23px/1.35 Georgia, serif; }
    ul { list-style: none; margin: 0; padding: 0; }
    li:not(:last-child) { border-bottom: 1px solid var(--library-line); }
    a { display: block; padding: 18px 0; text-decoration: none; color: var(--library-ink); }
    a span { display: block; font-size: 18px; font-weight: 550; }
    p { margin: 7px 0; color: var(--library-muted); line-height: 1.6; }
    .subgroups { margin-top: 24px; padding-left: 20px; border-left: 1px solid var(--library-line); }
    .compact-topic { margin-bottom: 20px; }
    .compact-topic h2 { font: 600 13px/1.5 system-ui, sans-serif; margin-bottom: 6px; }
    .compact-topic li { border: 0; }
    .compact-topic a { padding: 7px 9px; margin-left: -9px; color: var(--library-muted); }
    .compact-topic a span { font-size: 13px; font-weight: 400; }
    .compact-topic a[aria-current=page] { color: var(--library-ink); background: var(--library-soft); border-left: 2px solid var(--library-accent); }
    .compact-topic .subgroups { margin-top: 12px; padding-left: 12px; }
  `,
})
export class LibraryTreeView {
  groups = input.required<LibraryGroup[]>();
  compact = input(false);
  activeId = input<number | null>(null);
  readonly path = articlePath;
}
