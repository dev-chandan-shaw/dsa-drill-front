import { inject, Injectable, signal, makeStateKey, TransferState } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, of, tap } from 'rxjs';
import { IProblem } from '../../../modules/home/models/Question';

const PROBLEMS_STATE_KEY = makeStateKey<IProblem[]>('problems');

function problemsByTagKey(tagSlug: string) {
  return makeStateKey<IProblem[]>(`problems-tag-${tagSlug}`);
}

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

  /**
   * Silent freshness pass (stale-while-revalidate): when list data is already
   * present (TransferState snapshot or an earlier fetch), re-hit the network in
   * the background and patch the signal on arrival. Never touches `hasLoaded`,
   * so the template cannot flash back to skeleton — rows just update in place.
   * No-ops when nothing is loaded yet: the regular `fetchProblems()` call owns
   * the first paint, avoiding a double-fire on cold boots.
   */
  refreshProblemsInBackground(): void {
    if (!this.hasLoaded()) {
      return;
    }
    this.http.get<IProblem[]>(`${this.apiUrl}/problems`).subscribe({
      next: (res) => this.problemsSignal.set(res),
      // Freshness is best-effort: keep showing the snapshot on failure.
      error: () => undefined,
    });
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

  getProblemsByTag(tagId: string, force = false): Observable<IProblem[]> {
    const key = problemsByTagKey(tagId);

    if (!force) {
      const cached = this.transferState.get(key, null);
      if (cached) {
        this.transferState.remove(key);
        return of(cached);
      }
    }

    this.transferState.remove(key);

    return this.http.get<IProblem[]>(`${this.apiUrl}/problems/tag/${tagId}`).pipe(
      tap((res) => {
        // Server serializes into the prerendered HTML; the browser consumes
        // it above instead of refetching on hydration.
        this.transferState.set(key, res);
      }),
    );
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
