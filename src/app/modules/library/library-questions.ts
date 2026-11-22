import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemStatusApiService } from '../home/services/user/question-status-api.service';

@Component({
  selector: 'app-library-questions',
  imports: [ProblemList],
  template: `
    @if (error()) {
      <p role="alert">Questions could not be loaded. <button type="button" (click)="load()">Try again</button></p>
    } @else if (loading()) {
      <div class="library-loading"><p role="status">Loading questions…</p></div>
    } @else {
      <nav class="question-topics" aria-label="Question topics">
        <button type="button" [attr.aria-pressed]="selectedTag() === null" (click)="selectedTag.set(null)">All questions</button>
        @for (tag of tags(); track tag.id) {
          <button type="button" [attr.aria-pressed]="selectedTag() === tag.id" (click)="selectedTag.set(tag.id)">{{ tag.name }}</button>
        }
      </nav>
      <app-problem-list [problems]="visibleProblems()" [showFilters]="false" />
    }
  `,
  styleUrl: './library-loading.scss',
  styles: `
    .question-topics { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; }
    button { background:var(--library-paper); color:var(--library-muted); border:1px solid var(--library-line); border-radius:20px; padding:7px 12px; cursor:pointer; font:13px system-ui; }
    button[aria-pressed=true] { color:var(--library-ink); border-color:var(--library-ink); }
    p { color:var(--library-muted); padding:24px 0; }
  `,
})
export class LibraryQuestions implements OnInit {
  private readonly api = inject(PublicProblemService);
  private readonly tagApi = inject(ProblemTagService);
  private readonly auth = inject(AuthService);
  private readonly statuses = inject(ProblemStatusApiService);
  private readonly platform = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  readonly tags = this.tagApi.problemTags;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selectedTag = signal<number | null>(null);
  readonly visibleProblems = computed(() => this.api.problems().filter((p) => this.selectedTag() === null || p.tags.includes(this.selectedTag()!)));
  ngOnInit() {
    this.load();
    if (isPlatformBrowser(this.platform)) {
      this.auth.loadCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
        if (user) this.statuses.fetchProblemStatuses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      });
    }
  }
  load() {
    this.loading.set(true); this.error.set(false);
    forkJoin([this.api.fetchProblems(), this.tagApi.fetchProblemTags()]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loading.set(false), error: () => { this.loading.set(false); this.error.set(true); },
    });
  }
}
