import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LibraryApi } from '../library-api.service';
import { ArticleSummary } from '../library.models';
import { articleSections, CatalogSubject, findSubject, LIBRARY_CATALOG } from '../library-catalog';
import { SeoService } from '../../../shared/services/seo.service';

interface SelectedSection { subject: string; section: string; }

@Component({
  selector: 'app-library-admin', imports: [RouterLink, DatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './library-content-admin.html', styleUrls: ['../library.scss', './library-admin.scss'],
})
export class LibraryAdmin implements OnInit {
  private readonly api = inject(LibraryApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  readonly subjects: CatalogSubject[] = LIBRARY_CATALOG;
  readonly articles = signal<ArticleSummary[]>([]);
  readonly selectedSection = signal<SelectedSection | null>(null);
  readonly selectedSubject = signal('');
  readonly status = signal('all');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly sections = articleSections;
  readonly patternsOnly = this.route.snapshot.data['view'] === 'patterns';
  readonly scopedArticles = computed(() => {
    const section = this.selectedSection();
    return this.articles().filter((a) => (!this.patternsOnly || (a.subject === 'dsa' && a.section === 'patterns'))
      && (!this.selectedSubject() || a.subject === this.selectedSubject())
      && (!section || (a.subject === section.subject && a.section === section.section)));
  });
  readonly visibleArticles = computed(() => this.scopedArticles().filter((a) => this.status() === 'all'
    || (this.status() === 'drafts' && !a.publishedAt) || (this.status() === 'published' && !!a.publishedAt)
    || (this.status() === 'changes' && !!a.publishedAt && a.unpublishedChanges)));
  readonly sectionOptions = computed(() => this.sections.filter((s) => !this.selectedSubject() || s.subject === this.selectedSubject()));
  readonly newArticleSection = computed(() => {
    if (this.patternsOnly) return { subject: 'dsa', section: 'patterns' };
    const selected = this.selectedSection();
    if (selected) return { subject: selected.subject, section: selected.section };
    const first = this.selectedSubject() ? this.sectionOptions()[0] : null;
    return first ? { subject: first.subject, section: first.code } : null;
  });
  readonly selectedSectionValue = computed(() => {
    const value = this.selectedSection();
    return value ? `${value.subject}/${value.section}` : null;
  });
  readonly statusTabs = computed(() => [
    { code: 'all', title: this.patternsOnly ? 'All patterns' : 'All articles', count: this.scopedArticles().length },
    { code: 'drafts', title: 'Drafts', count: this.scopedArticles().filter((a) => !a.publishedAt).length },
    { code: 'published', title: 'Published', count: this.scopedArticles().filter((a) => !!a.publishedAt).length },
    { code: 'changes', title: 'Unpublished changes', count: this.scopedArticles().filter((a) => !!a.publishedAt && a.unpublishedChanges).length },
  ]);

  ngOnInit() {
    this.seo.setPageMeta({ title: 'Library publishing - DSA Drill', description: 'Manage library articles.', robots: 'noindex' });
    const subject = this.route.snapshot.queryParamMap.get('subject');
    const section = this.route.snapshot.queryParamMap.get('section');
    const requested = this.sections.find((s) => s.subject === subject && s.code === section);
    if (requested) this.selectedSection.set({ subject: requested.subject, section: requested.code });
    this.load();
  }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.adminArticles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (articles) => { this.articles.set(articles); this.loading.set(false); },
      error: () => { this.error.set('Unable to load publishing data. Try again.'); this.loading.set(false); },
    });
  }
  setSubject(code: string) { this.selectedSubject.set(code); this.selectedSection.set(null); }
  location(article: ArticleSummary) {
    const subject = findSubject(article.subject);
    return `${subject?.title ?? article.subject} / ${subject?.sections.find((s) => s.code === article.section)?.title ?? article.section}`;
  }
  selectSection(value: SelectedSection | null) {
    this.selectedSection.set(value);
  }
  sectionValue(section: { subject: string; code: string }) { return `${section.subject}/${section.code}`; }
  selectSectionValue(value: string | null) {
    if (!value) {
      this.selectSection(null);
      return;
    }
    const [subject, section] = value.split('/');
    this.selectSection({ subject, section });
  }
}
