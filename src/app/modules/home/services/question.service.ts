import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { IProblem } from '../models/Question';

@Injectable({
  providedIn: 'root',
})
export class ProblemService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // 1. Keep the state private
  private readonly _problems = signal<IProblem[]>([]);

  // 2. Expose a read-only version for components
  public readonly problems = this._problems.asReadonly();

  fetchProblems(): Observable<IProblem[]> {
    return this.http
      .get<IProblem[]>(`${this.apiUrl}/problems`)
      .pipe(tap((res) => this._problems.set(res)));
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
