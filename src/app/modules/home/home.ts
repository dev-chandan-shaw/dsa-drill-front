import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemStatusApiService } from './services/user/question-status-api.service';
import { isPlatformBrowser } from '@angular/common';
import { take } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressBarModule,
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
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  problems = this.questionService.problems;
  tags = this.questionTagService.problemTags;
  readonly loadError = signal(false);
  readonly skeletonRows = Array.from({ length: 8 });

  hasLoaded = computed(
    () => this.questionService.hasLoaded() && this.questionTagService.hasLoaded(),
  );

  ngOnInit(): void {
    this.titleService.setTitle('Library - DSA Drill');
    this.metaService.updateTag({
      name: 'description',
      content: 'Browse the complete library of DSA problems, organized by category, topic, and difficulty. Track your progress and patterns.',
    });
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loadError.set(false);
    this.questionService
      .fetchProblems()
      .subscribe({ error: () => this.loadError.set(true) });
    // Silent freshness: instant paint from cache first, then reconcile with the
    // server in the background (no-ops on cold boots where fetchProblems owns
    // the first paint, so no double-fire and no skeleton flash).
    this.questionService.refreshProblemsInBackground();
    this.questionTagService
      .fetchProblemTags()
      .subscribe({ error: () => this.loadError.set(true) });
    // Same silent treatment for the tag strip.
    this.questionTagService.refreshProblemTagsInBackground();
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
