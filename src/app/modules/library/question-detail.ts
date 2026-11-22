import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemList } from '../../shared/components/problem-list/problem-list';

@Component({
  selector: 'app-question-detail',
  imports: [AsyncPipe, RouterLink, ProblemList],
  styleUrl: './library.scss',
  template: `<section class="library-shell subject-shell">
    <a routerLink="/library/dsa/questions">Questions</a>
    @if (page | async; as data) {
      @if (data.problem; as question) {
        <header class="library-head">
          <h1>{{ question.title }}</h1>
        </header>
        <app-problem-list [problems]="[question]" [showFilters]="false" [detail]="true" />
        <p>
          <a class="library-button" [href]="question.link" target="_blank" rel="noopener"
            >Practice question</a
          >
        </p>
      } @else {
        <p role="status">{{ data.message }}</p>
      }
    }
  </section>`,
})
export class QuestionDetail {
  private api = inject(PublicProblemService);
  private response = inject(RESPONSE_INIT, { optional: true });
  readonly page = inject(ActivatedRoute).paramMap.pipe(
    switchMap((p) =>
      this.api.getVisibleProblem(p.get('id')!).pipe(
        map((problem) => ({ problem, message: '' })),
        catchError((err) => {
          if (this.response) this.response.status = err.status === 404 ? 404 : 503;
          return of({ problem: null, message: 'This question is unavailable.' });
        }),
        startWith({ problem: null, message: 'Loading question…' }),
      ),
    ),
  );
}
