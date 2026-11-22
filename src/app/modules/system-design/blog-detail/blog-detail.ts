import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../../shared/services/seo.service';
import { BlogService } from '../../../shared/services/public-api/blog.service';
import { IBlogPost, IBlogPostSummary } from '../../../shared/models/blog-post';
import { MarkdownView } from '../../../shared/components/markdown-view/markdown-view';
import { markdownExcerpt } from '../../question-pattern/markdown-excerpt';
import { blogCoverBackground } from '../blog-covers';
import { PostContent } from '../blog.resolvers';

@Component({
  selector: 'app-blog-detail',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MarkdownView],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.scss',
})
export class BlogDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seoService = inject(SeoService);
  private readonly blogService = inject(BlogService);

  readonly post = signal<IBlogPost | null>(null);
  readonly posts = signal<IBlogPostSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly olderPost = computed(() => {
    const index = this.postIndex();
    const posts = this.posts();
    return index >= 0 && index + 1 < posts.length ? posts[index + 1] : null;
  });

  readonly newerPost = computed(() => {
    const index = this.postIndex();
    return index > 0 ? this.posts()[index - 1] : null;
  });

  private currentSectionSlug = '';
  private currentPostSlug = '';

  ngOnInit(): void {
    const preloaded = this.route.snapshot.data['postContent'] as
      | PostContent
      | null
      | undefined;
    if (preloaded) {
      this.post.set(preloaded.post);
      this.posts.set(preloaded.posts);
      this.loading.set(false);
      this.applyMeta(preloaded.post);
      return;
    }

    this.route.paramMap
      .pipe(
        map((params) => ({
          sectionSlug: params.get('sectionSlug') ?? '',
          postSlug: params.get('postSlug') ?? '',
        })),
        distinctUntilChanged(
          (a, b) => a.sectionSlug === b.sectionSlug && a.postSlug === b.postSlug,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ sectionSlug, postSlug }) => this.load(sectionSlug, postSlug));
  }

  retry(): void {
    this.load(this.currentSectionSlug, this.currentPostSlug);
  }

  coverBackground(post: IBlogPost): string {
    return blogCoverBackground(post.coverImageUrl, post.slug);
  }

  private load(sectionSlug: string, postSlug: string): void {
    this.currentSectionSlug = sectionSlug;
    this.currentPostSlug = postSlug;
    this.loading.set(true);
    this.loadError.set(false);
    this.post.set(null);
    this.posts.set([]);

    this.blogService
      .fetchPostDetail(sectionSlug, postSlug)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => {
          this.post.set(post);
          this.loading.set(false);
          this.applyMeta(post);
          this.loadSiblingPosts(sectionSlug);
        },
        error: (error) => {
          this.loading.set(false);
          if (error?.status === 404) {
            this.post.set(null);
            this.applyMeta(null);
          } else {
            this.loadError.set(true);
          }
        },
      });
  }

  private loadSiblingPosts(sectionSlug: string): void {
    this.blogService
      .fetchPosts(sectionSlug)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (posts) => this.posts.set(posts),
        error: () => this.posts.set([]),
      });
  }

  private postIndex(): number {
    const id = this.post()?.id;
    if (id == null) {
      return -1;
    }
    return this.posts().findIndex((item) => item.id === id);
  }

  private applyMeta(post: IBlogPost | null): void {
    if (!post) {
      this.seoService.setPageMeta({
        title: 'Article not found - DSA Drill',
        description: 'The requested article does not exist.',
        path: '/system-design',
        robots: 'noindex,follow',
      });
      return;
    }
    this.seoService.setPageMeta({
      title: `${post.title} - ${post.sectionName} - DSA Drill`,
      description:
        post.excerpt || markdownExcerpt(post.content, 155) || `Read ${post.title}.`,
      path: `/system-design/${post.sectionSlug}/${post.slug}`,
      ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
      robots: 'index,follow',
    });
  }
}
