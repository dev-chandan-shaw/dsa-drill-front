import {
  inject,
  Injectable,
  signal,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { IProblem } from '../models/Question';

const PROBLEMS_STATE_KEY = makeStateKey<IProblem[]>('problems');

@Injectable({
  providedIn: 'root',
})
export class ProblemService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);

  // 1. Keep the state private
  private readonly _problems = signal<IProblem[]>([]);

  // 2. Expose a read-only version for components
  public readonly problems = this._problems.asReadonly();

  fetchProblems(): Observable<IProblem[]> {
    const cached = this.transferState.get(PROBLEMS_STATE_KEY, null as IProblem[] | null);

    if (cached) {
      if (isPlatformBrowser(this.platformId)) {
        this.transferState.remove(PROBLEMS_STATE_KEY);
      }
      this._problems.set(cached);
      return of(cached);
    }

    return this.http.get<IProblem[]>(`${this.apiUrl}/problems`).pipe(
      tap((res) => {
        this._problems.set(res);
        this.transferState.set(PROBLEMS_STATE_KEY, res);
      }),
    );
  }

  addProblem(payload: IProblem) {
    return this.http
      .post<IProblem>(`${this.apiUrl}/problems`, payload)
      .pipe(tap((res) => this._problems.update((currentQuestions) => [...currentQuestions, res])));
  }

  editProblem(payload: IProblem) {
    const url = `${this.apiUrl}/problems`;
    return this.http.put<IProblem>(url, payload).pipe(
      tap((res) => {
        this._problems.update((currentQuestions) =>
          currentQuestions.map((q) => (q.id === res.id ? { ...q, ...res } : q)),
        );
      }),
    );
  }

  getProblemBySlug(slug: string): Observable<IProblem> {
    return this.http.get<IProblem>(`${this.apiUrl}/problems/slug/${slug}`);
  }

  getProblemsByTag(tagId: string): Observable<IProblem[]> {
    return this.http.get<IProblem[]>(`${this.apiUrl}/problems/tag/${tagId}`);
  }
}
