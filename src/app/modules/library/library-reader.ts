import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { afterRenderEffect, Component, DestroyRef, ElementRef, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarkdownView } from '../../shared/components/markdown-view/markdown-view';
import { MarkdownService } from '../../shared/services/markdown.service';
import { SeoService } from '../../shared/services/seo.service';
import { LibraryReaderData } from './library.resolvers';
import { articlePath } from './library.models';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { catchError, concat, forkJoin, map, of, switchMap } from 'rxjs';
import { LibraryApi } from './library-api.service';

@Component({
  selector: 'app-library-reader', imports: [RouterLink, MarkdownView],
  templateUrl: './library-reader.html', styleUrls: ['./library.scss', './library-reader.scss'],
})
export class LibraryReader implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly markdown = inject(MarkdownService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tagsApi = inject(ProblemTagService);
  private readonly api = inject(LibraryApi);
  private readonly platform = inject(PLATFORM_ID);
  private scrolledArticle: number | null = null;
  readonly tags = this.tagsApi.problemTags;
  readonly data = signal<LibraryReaderData | null>(null);
  readonly headings = signal<{ id: string; text: string; level: number }[]>([]);
  readonly activeHeading = signal('');
  readonly narrow = signal(false);
  readonly loading = signal(true);
  readonly path = articlePath;

  constructor() {
    afterRenderEffect((cleanup) => {
      const article = this.data()?.article;
      if (!article) return;
      this.resize();
      const enteredArticle = this.scrolledArticle !== article.summary.id;
      if (enteredArticle) {
        this.host.nativeElement.closest('.content')?.scrollTo({ top: 0 });
        this.scrolledArticle = article.summary.id;
      }
      const elements = this.host.nativeElement.querySelectorAll<HTMLElement>('.article-content h1[id], .article-content h2[id], .article-content h3[id]');
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) this.activeHeading.set(visible.target.id);
      }, { root: this.host.nativeElement.closest('.content'), rootMargin: '-4% 0px -65% 0px' });
      elements.forEach((element) => observer.observe(element));
      cleanup(() => observer.disconnect());
      if (enteredArticle && this.route.snapshot.fragment) this.scrollTo(this.route.snapshot.fragment, false);
    });
  }
  ngOnInit() {
    this.route.data.pipe(
      switchMap(({ library }) => {
        const page = library as LibraryReaderData;
        if (!isPlatformBrowser(this.platform)) return of(page);
        const params = this.route.snapshot.paramMap;
        return concat(of(page), forkJoin({
          tree: this.api.tree(params.get('subject')!, params.get('section')!).pipe(catchError(() => of(page.tree))),
          article: this.api.article(params.get('subject')!, params.get('section')!, params.get('slug')!),
        }).pipe(
          map((result): LibraryReaderData => ({ ...page, ...result, error: null })),
          catchError((error) => of(page.article && error.status !== 404 ? page : {
            ...page, article: null,
            error: error.status === 404 ? 'This article does not exist or is not published.' : 'Unable to load this article. Please try again.',
          })),
        ));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((page) => {
      this.data.set(page);
      this.loading.set(!page.article && !page.error);
      if (this.loading()) {
        this.headings.set([]);
        return;
      }
      if (page.article?.summary.subject === 'dsa' && page.article.summary.section === 'patterns') {
        this.tagsApi.fetchProblemTags().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
      }
      this.headings.set(page.article ? this.markdown.renderArticle(page.article.content).headings.filter((h) => h.level <= 3) : []);
      this.activeHeading.set('');
      this.seo.setPageMeta({ title: `${page.article?.summary.title ?? 'Article unavailable'} - DSA Drill`,
        description: page.article?.summary.excerpt || page.subject?.description || 'Read concepts and design walkthroughs in the DSA Drill library.',
        path: page.article ? articlePath(page.article.summary) : this.router.url,
        image: page.article?.coverImageUrl ?? undefined, robots: page.error ? 'noindex' : 'index,follow' });
    });
  }
  jump(event: Event, id: string) { event.preventDefault(); this.scrollTo(id, true); }
  @HostListener('window:resize')
  resize() { this.narrow.set(this.document.defaultView?.matchMedia('(max-width: 760px)').matches ?? false); }
  private scrollTo(id: string, smooth: boolean) {
    const element = this.document.getElementById(id);
    if (!element) return;
    const reduced = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: smooth && !reduced ? 'smooth' : 'instant', block: 'start' });
    element.focus({ preventScroll: true });
    this.activeHeading.set(id);
  }
  retry() { void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' }); }
}
