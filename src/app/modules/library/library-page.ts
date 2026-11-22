import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LibraryPageData } from './library.resolvers';
import { LibraryApi } from './library-api.service';
import { LibraryTreeView } from './library-tree';
import { LibraryQuestions } from './library-questions';
import { LibrarySheets } from './library-sheets';
import { LibraryPatterns } from './library-patterns';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-library-page',
  imports: [RouterLink, LibraryTreeView, LibraryQuestions, LibrarySheets, LibraryPatterns],
  template: `
    @if (data(); as page) {
      @if (page.error) {
        <section class="library-state">
          <h1>Library unavailable</h1>
          <p role="alert">{{ page.error }}</p>
          <button class="library-button" type="button" (click)="retry()">Try again</button>
          <a class="library-button" routerLink="/library">Back to library</a>
        </section>
      } @else {
        <div class="library-shell" [class.subject-shell]="!!page.subject">
          @if (page.subject; as subject) {
            <!-- <nav class="library-crumb" aria-label="Breadcrumb">
              <a routerLink="/library">Library</a><span>/</span><span>{{ subject.title }}</span>
            </nav> -->
            <header class="library-head">
              <h1>{{ subject.title }}</h1>
              <p>{{ subject.description }}</p>
            </header>
            <nav class="section-tabs" aria-label="Subject sections">
              @for (section of subject.sections; track section.code) {
                <a
                  [routerLink]="['/library', subject.code, section.code]"
                   [attr.aria-current]="page.section?.code === section.code ? 'page' : null"
                  >{{ section.title }}</a
                >
              }
            </nav>
            @if (page.subject.code === 'dsa' && page.section?.code === 'patterns') {
              <app-library-patterns />
            } @else if (page.section?.viewType === 'QUESTION_LIST') {
              <app-library-questions />
            } @else if (page.section?.viewType === 'SHEET_LIST') {
              <app-library-sheets />
            } @else if (page.section?.viewType === 'ARTICLE_COLLECTION') {
              @if (loading()) {
                <div class="library-loading"><p role="status">Loading articles…</p></div>
              } @else if (treeError()) {
                <div class="library-state">
                  <p role="alert">
                    Could not load this section.
                    <button class="library-button" type="button" (click)="retry()">
                      Try again
                    </button>
                  </p>
                </div>
              } @else if (page.tree; as tree) {
                @if (tree.groups.length) {
                  <div class="collection"><app-library-tree [groups]="tree.groups"
                    [shaded]="page.subject.code === 'hld' || page.subject.code === 'lld'" /></div>
                } @else {
                  <div class="library-state">
                    <p>
                      Articles for this section are being prepared. Explore another section in the
                      meantime.
                    </p>
                  </div>
                }
              }
            }
          } @else {
            <header class="library-head">
              <h1>A place to understand.</h1>
              <p>
                Build your foundations, connect the ideas, and prepare for your next interview.
                Choose a subject to begin.
              </p>
            </header>
            <div class="subject-grid">
              @for (subject of page.subjects; track subject.code) {
                <a
                  class="subject-card"
                  [routerLink]="['/library', subject.code]"
                >
                  <h2>{{ subject.title }}</h2>
                  <p>{{ subject.description }}</p>
                  <small>{{ sectionNames(subject.sections) }}</small
                  ><strong>Explore {{ subject.title }}</strong>
                </a>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styleUrl: './library.scss',
})
export class LibraryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly api = inject(LibraryApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly data = signal<LibraryPageData | null>(null);
  readonly loading = signal(false);
  readonly treeError = signal(false);
  readonly designOverview = signal(false);
  private readonly pageLocation = computed(() => {
    const page = this.data();
    return page ? `${page.subject?.code ?? ''}/${page.section?.code ?? ''}` : null;
  });
  private treeRequest = 0;
  constructor() {
    afterRenderEffect(() => {
      this.pageLocation();
      const fragment = this.route.snapshot.fragment;
      if (fragment)
        this.host.nativeElement.querySelector(`[id="${CSS.escape(fragment)}"]`)?.scrollIntoView();
      else this.host.nativeElement.closest('.content')?.scrollTo({ top: 0 });
    });
  }
  sectionNames(sections: { title: string }[]) {
    return sections.map((s) => s.title).join(' · ');
  }
  ngOnInit() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ library }) => {
      const page = library as LibraryPageData;
      const overview = !!page.subject && page.subject.code !== 'dsa' && !this.route.snapshot.paramMap.has('section');
      this.designOverview.set(overview);
      this.data.set(page);
      this.seo.setPageMeta({
        title: `${page.subject?.title ?? 'Library'} - DSA Drill`,
        description:
          page.subject?.description ??
          'Learn DSA, low-level design, and high-level design through concepts, patterns, and worked examples.',
        path: page.subject ? `/library/${page.subject.code}${overview ? '' : `/${page.section?.code}`}` : '/library',
        robots: page.error ? 'noindex' : 'index,follow',
      });
      this.loadTree(page);
    });
  }
  private loadTree(page: LibraryPageData) {
    const request = ++this.treeRequest;
    this.treeError.set(false);
    if (page.error || !page.subject || page.section?.viewType !== 'ARTICLE_COLLECTION'
      || (page.subject.code === 'dsa' && page.section.code === 'patterns')) {
      this.loading.set(false);
      return;
    }
    this.loading.set(!page.tree);
    const {subject, section} = page;
    const source = this.api.tree(subject.code,section.code);
    source
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tree) => {
          if (request !== this.treeRequest) return;
          this.loading.set(false);
          this.data.set({ ...page, tree });
        },
        error: () => {
          if (request !== this.treeRequest) return;
          this.loading.set(false);
           this.treeError.set(!page.tree);
        },
      });
  }
  retry() {
    const page = this.data();
    if (page && this.treeError()) {
      this.loadTree(page);
      return;
    }
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
