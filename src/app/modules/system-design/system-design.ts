import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../shared/services/seo.service';
import { BlogService } from '../../shared/services/public-api/blog.service';
import { IBlogSection } from '../../shared/models/blog-section';
import { blogCoverBackground } from './blog-covers';

@Component({
  selector: 'app-system-design',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './system-design.html',
  styleUrl: './system-design.scss',
})
export class SystemDesign implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seoService = inject(SeoService);
  private readonly blogService = inject(BlogService);

  readonly sections = signal<IBlogSection[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly skeletonCards = Array.from({ length: 6 });

  ngOnInit(): void {
    const preloaded = this.route.snapshot.data['sections'] as
      | IBlogSection[]
      | null
      | undefined;
    if (preloaded) {
      this.sections.set(preloaded);
      this.loading.set(false);
    } else {
      this.load();
    }
    this.seoService.setPageMeta({
      title: 'System Design - DSA Drill',
      description:
        'Low-level design, high-level design, and system design concepts explained with practical examples.',
      path: '/system-design',
      robots: 'index,follow',
    });
  }

  retry(): void {
    this.load();
  }

  coverBackground(section: IBlogSection): string {
    return blogCoverBackground(section.coverImageUrl, section.slug);
  }

  trackBySectionId(_: number, section: IBlogSection): number {
    return section.id;
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.blogService
      .fetchSections()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sections) => {
          this.sections.set(sections);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }
}
