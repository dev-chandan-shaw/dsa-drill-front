import { inject, Injectable, signal, makeStateKey } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, of, tap } from 'rxjs';
import { IProblem } from '../../../modules/home/models/Question';

const PROBLEMS_STATE_KEY = makeStateKey<IProblem[]>('problems');

@Injectable({
  providedIn: 'root',
})
export class PublicProblemService {
  private readonly apiUrl = environment.apiUrl + '/public';
  private readonly http = inject(HttpClient);

  private readonly problemsSignal = signal<IProblem[]>([]);
  public isLoading = signal<boolean>(false); // Progress bar state
  public hasLoaded = signal<boolean>(false); // Cache state

  // Read-only access for components
  public problems = this.problemsSignal.asReadonly();

  fetchProblems() {
    if (this.hasLoaded()) return of([]);
    this.isLoading.set(true);
    return this.http.get<IProblem[]>(`${this.apiUrl}/problems`).pipe(
      tap((res) => {
        this.problemsSignal.set(res);
        this.hasLoaded.set(true);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  addProblem(payload: IProblem) {
    return this.http.post<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  editProblem(payload: IProblem) {
    const url = `${this.apiUrl}/problems`;
    return this.http.put<IProblem>(url, payload);
  }

  getProblemBySlug(slug: string): Observable<IProblem> {
    return this.http.get<IProblem>(`${this.apiUrl}/problems/slug/${slug}`);
  }

  getProblemsByTag(tagId: string): Observable<IProblem[]> {
    return this.http.get<IProblem[]>(`${this.apiUrl}/problems/tag/${tagId}`);
  }
}
