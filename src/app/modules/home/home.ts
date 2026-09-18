import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemStatusApiService } from './services/user/question-status-api.service';
import { SeoService } from '../../shared/services/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { take } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    ProblemList,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly questionTagService = inject(ProblemTagService);
  private readonly questionService = inject(PublicProblemService);
  private readonly authService = inject(AuthService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seoService = inject(SeoService);

  problems = this.questionService.problems;
  tags = this.questionTagService.problemTags;
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 8 });

  hasLoaded = computed(
    () => this.questionService.hasLoaded() && this.questionTagService.hasLoaded(),
  );

  ngOnInit(): void {
    this.seoService.setPageMeta({
      title: 'Library - DSA Drill',
      description:
        'Browse the complete library of DSA problems, organized by category, topic, and difficulty. Track your progress and patterns.',
      path: '/home',
    });
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loadError.set(false);
    // Server-only fetch: runs on the server during SSR and serializes via
    // TransferState. The client consumes the snapshot with no extra network
    // call — no background refresh needed for fresh first paint.
    this.questionService
      .fetchProblems()
      .subscribe({ error: () => this.loadError.set(true) });
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.loadError.set(true) });
    if (isPlatformBrowser(this.platformId)) {
      // Personal statuses ride the auth-resolution event, not a synchronous
      // login check: on cold boots auth is still unresolved at init, and the
      // old sync check skipped statuses forever. Resolved-with-user fires the
      // single fetch; resolved-null skips it for good. No extra auth request —
      // loadCurrentUser() is shared and cached.
      this.authService
        .loadCurrentUser()
        .pipe(take(1))
        .subscribe((user) => {
          if (user) {
            this.questionStatusService.fetchProblemStatuses().subscribe();
          }
        });
    }
  }
}
