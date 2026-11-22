import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, forkJoin, map, Observable, switchMap, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../../shared/services/seo.service';
import { BlogService } from '../../../shared/services/public-api/blog.service';
import { IBlogSection } from '../../../shared/models/blog-section';
import { IBlogPostSummary } from '../../../shared/models/blog-post';
import { blogCoverBackground } from '../blog-covers';
import { SectionContent } from '../blog.resolvers';

@Component({
  selector: 'app-section-posts',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './section-posts.html',
  styleUrl: './section-posts.scss',
})
export class SectionPosts implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seoService = inject(SeoService);
  private readonly blogService = inject(BlogService);

  readonly section = signal<IBlogSection | null>(null);
  readonly posts = signal<IBlogPostSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly skeletonCards = Array.from({ length: 6 });

  private currentSlug = '';

  ngOnInit(): void {
    const preloaded = this.route.snapshot.data['sectionContent'] as
      | SectionContent
      | null
      | undefined;
    if (preloaded) {
      this.applyContent(preloaded);
      return;
    }

    this.route.paramMap
      .pipe(
        map((params) => params.get('sectionSlug') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((slug) => this.load(slug));
  }

  retry(): void {
    this.load(this.currentSlug);
  }

  coverBackground(post: IBlogPostSummary): string {
    return blogCoverBackground(post.coverImageUrl, post.slug);
  }

  trackByPostId(_: number, post: IBlogPostSummary): number {
    return post.id;
  }

  private load(slug: string): void {
    this.currentSlug = slug;
    this.loading.set(true);
    this.loadError.set(false);

    this.fetchContent(slug)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (content) => this.applyContent(content),
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  private fetchContent(slug: string): Observable<SectionContent> {
    return forkJoin({
      sections: this.blogService.fetchSections(),
      posts: this.blogService.fetchPosts(slug),
    }).pipe(
      map(({ sections, posts }) => ({
        section: sections.find((section) => section.slug === slug) ?? null,
        posts,
      })),
    );
  }

  private applyContent(content: SectionContent): void {
    this.section.set(content.section);
    this.posts.set(content.posts);
    this.loading.set(false);
    this.applyMeta(content.section);
  }

  private applyMeta(section: IBlogSection | null): void {
    if (!section) {
      this.seoService.setPageMeta({
        title: 'Section not found - DSA Drill',
        description: 'The requested System Design section does not exist.',
        path: '/system-design',
        robots: 'noindex,follow',
      });
      return;
    }
    this.seoService.setPageMeta({
      title: `${section.name} - System Design - DSA Drill`,
      description:
        section.description ||
        `Articles and deep dives about ${section.name} in system design.`,
      path: `/system-design/${section.slug}`,
      ...(section.coverImageUrl ? { image: section.coverImageUrl } : {}),
      robots: 'index,follow',
    });
  }
}
