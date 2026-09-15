import { inject, Injectable, signal, makeStateKey, TransferState } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, of, tap } from 'rxjs';
import { IProblem } from '../../../modules/home/models/Question';

const PROBLEMS_STATE_KEY = makeStateKey<IProblem[]>('problems');

@Injectable({
  providedIn: 'root',
})
export class PublicProblemService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);

  private readonly apiUrl = environment.apiUrl + '/public';

  private readonly problemsSignal = signal<IProblem[]>([]);

  public isLoading = signal(false);
  public hasLoaded = signal(false);

  public problems = this.problemsSignal.asReadonly();

  fetchProblems(reload: boolean = false): Observable<IProblem[]> {
    if (this.hasLoaded() && !reload) {
      return of(this.problemsSignal());
    }

    if (!reload) {
      const cached = this.transferState.get(PROBLEMS_STATE_KEY, null);

      if (cached) {
        this.problemsSignal.set(cached);
        this.hasLoaded.set(true);

        this.transferState.remove(PROBLEMS_STATE_KEY);

        return of(cached);
      }
    }

    // A forced reload always hits the network so post-save refreshes
    // never resolve with stale SSR TransferState data.
    this.transferState.remove(PROBLEMS_STATE_KEY);

    this.isLoading.set(true);

    return this.http.get<IProblem[]>(`${this.apiUrl}/problems`).pipe(
      tap((res) => {
        this.problemsSignal.set(res);
        this.hasLoaded.set(true);

        this.transferState.set(PROBLEMS_STATE_KEY, res);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  addProblem(payload: IProblem) {
    return this.http.post<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  editProblem(payload: IProblem) {
    return this.http.put<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  getProblemBySlug(slug: string): Observable<IProblem> {
    return this.http.get<IProblem>(`${this.apiUrl}/problems/slug/${slug}`);
  }

  getProblemsByTag(tagId: string): Observable<IProblem[]> {
    return this.http.get<IProblem[]>(`${this.apiUrl}/problems/tag/${tagId}`);
  }

  upsertProblemSignal(problem: IProblem): void {
    const current = this.problemsSignal();
    const index = current.findIndex((item) => item.id === problem.id);

    if (index === -1) {
      this.problemsSignal.set([...current, problem]);
    } else {
      this.problemsSignal.set(current.map((item) => (item.id === problem.id ? problem : item)));
    }
    this.hasLoaded.set(true);
  }

  removeProblemSignal(problemId: number): void {
    this.problemsSignal.set(this.problemsSignal().filter((item) => item.id !== problemId));
  }
}
